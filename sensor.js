'use strict';

const { Bme680 } = require('bme680-sensor');
var debug = require('debug')('BME680');
var logger = require("mcuiot-logger").logger;
const moment = require('moment');
var os = require("os");
var hostname = os.hostname();

let Service, Characteristic;
var CustomCharacteristic;
var FakeGatoHistoryService;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  CustomCharacteristic = require('./lib/CustomCharacteristic.js')(homebridge);
  FakeGatoHistoryService = require('fakegato-history')(homebridge);

  homebridge.registerAccessory('homebridge-bme680', 'BME680', BME680Plugin);
};

class BME680Plugin {
  constructor(log, config) {
    this.log = log;
    this.name = config.name;
    this.name_temperature = config.name_temperature || this.name;
    this.name_humidity = config.name_humidity || this.name;
    this.name_air_quality = config.name_air_quality || this.name;
    this.refresh = config['refresh'] || 60; // Update every minute
    this.options = config.options || {};
    this.storage = config['storage'] || "fs";

    this.init = false;
    this.data = {};
    if ('i2cBusNo' in this.options) this.options.i2cBusNo = parseInt(this.options.i2cBusNo);
    if ('i2cAddress' in this.options) this.options.i2cAddress = parseInt(this.options.i2cAddress);
    this.log(`BME680 sensor options: ${JSON.stringify(this.options)}`);

    try {
      this.sensor = new Bme680(this.options.i2cBusNo, this.options.i2cAddress);
    } catch (ex) {
      this.log("BME680 initialization failed:", ex);
    }

    if (this.sensor)
      this.sensor.initialize()
      .then(() => {
        this.log(`BME680 initialization succeeded`);
        this.init = true;

        this.devicePolling.bind(this);
      })
      .catch(err => this.log(`BME680 initialization failed: ${err} `));


    this.informationService = new Service.AccessoryInformation();

    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "bme680")
      .setCharacteristic(Characteristic.Model, "RPI-BME680")
      .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + hostname)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

    this.temperatureService = new Service.TemperatureSensor(this.name_temperature);

    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100,
        maxValue: 100
      });
    //        .on('get', this.getCurrentTemperature.bind(this));

    this.temperatureService
      .addCharacteristic(CustomCharacteristic.AtmosphericPressureLevel);

    this.humidityService = new Service.HumiditySensor(this.name_humidity);

    this.airQualityService = new Service.AirQualitySensor(this.name_air_quality);

    setInterval(this.devicePolling.bind(this), this.refresh * 1000);

    this.temperatureService.log = this.log;
    this.loggingService = new FakeGatoHistoryService("weather", this.temperatureService,{
          storage: this.storage,
          minutes: this.refresh * 10 / 60
        });

  }

  devicePolling() {
    debug("Polling BME680");
    if (this.sensor) {
      this.sensor.getSensorData()
        .then(data => {
          if(data.data.heat_stable){
            this.log(`data(temp) = ${JSON.stringify(data, null, 2)}`);

            this.loggingService.addEntry({
              time: moment().unix(),
              temp: roundInt(data.data.temperature),
              pressure: roundInt(data.data.pressure),
              humidity: roundInt(data.data.humidity),
              airQuality: roundInt(data.data.gas_resistance)
            });

            this.temperatureService
                .setCharacteristic(Characteristic.CurrentTemperature, roundInt(data.data.temperature));
            this.temperatureService
                .setCharacteristic(CustomCharacteristic.AtmosphericPressureLevel, roundInt(data.data.pressure));
            this.humidityService
                .setCharacteristic(Characteristic.CurrentRelativeHumidity, roundInt(data.data.humidity));
            const airQuality = computeIAQ(roundInt(data.data.gas_reistance), roundInt(data.data.humidity));
            this.log(`airQuality = ${airQuality}`);
            this.airQualityService.setCharacteristic(Characteristic.AirQuality, airQuality);
            this.airQualityService.setCharacteristic(Characteristic.VOCDensity, clamp(roundInt(data.data.gas_resistance / 100)), 0, 1000);
          }
        })
        .catch(err => {
          this.log(`BME read error: ${err}`);
          debug(err.stack);
        });
    } else {
      this.log("Error: BME680 Not Initalized");
    }
  }

  getServices() {
    return [this.informationService, this.temperatureService, this.humidityService, this.airQualityService, this.loggingService]
  }
}

function roundInt(string) {
  return Math.round(parseFloat(string) * 10) / 10;
}

function computeIAQ(gas, humidity) {
  const humidityWeight = 0.25;
  let gasOffset = 50000 - gas;
  let humidityOffset = humidity - 40;
  let humidityScore = 0, gasScore = 0;

  if(humidityOffset > 0) {
    humidityScore = (100 - 40 - humidityOffset);
    humidityScore /= (100 - 40);
    humidityScore *= (humidityWeight * 100);
  }else{
    humidityScore = (40 + humidityOffset);
    humidityScore /= 40;
    humidityScore *= (humidityWeight * 100);
  }

  if(gasOffset > 0){
    gasScore = (gas / 50000);
    gasScore *= (100 - (humidityWeight * 100));
  }else{
    gasScore = 100 - (humidityWeight * 100);
  }
  return (humidityScore + gasScore) / 20;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}
