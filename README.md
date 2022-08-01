# homebridge-bme280

[![NPM Downloads](https://img.shields.io/npm/dm/homebridge-bme680.svg?style=flat)](https://npmjs.org/package/homebridge-bme680)

[Bosch BME680](https://www.bosch-sensortec.com/bst/products/all_products/bme680)
temperature/humidity/VOC/barometric pressure sensor service plugin for [Homebridge](https://github.com/nfarina/homebridge).


* Display of temperature and humidity from a BME680 connected to a RaspberryPI.

Uses [bme680-sensor](https://www.npmjs.com/package/bme680-sensor)

## Installation
1.	Install Homebridge using `npm install -g homebridge`
2.	Install this plugin `npm install -g homebridge-bme680`
3.	Update your configuration file - see below for an example

Connect the BME680 chip to the I2C bus

Enable I2C on the RaspberryPI by going to the RaspberryPI's `RaspberryPi Configuration` page and checking the `Enable I2C` checkbox.

## Configuration
* `accessory`: "BME680"
* `name`: descriptive name
* `name_temperature` (optional): descriptive name for the temperature sensor
* `name_humidity` (optional): descriptive name for the humidity sensor
* `refresh`: Optional, time interval for refreshing data in seconds, defaults to 60 seconds.
* `options`: options for [bme680-sensor](https://www.npmjs.com/package/bme680-sensor)

If you get an I/O error, make sure the I2C address is correct (usually 0x76 or 0x77 depending on a jumper).

Example configuration:

```json
    "accessories": [
        {
            "accessory": "BME680",
            "name": "Sensor",
            "name_temperature": "Temperature",
            "name_humidity": "Humidity",
            "options": {
              "i2cBusNo": 1,
              "i2cAddress": "0x76"
            }
        }
    ]
```

This plugin creates two services: TemperatureSensor and HumiditySensor.

## See also

* [homebridge-ds18b20](https://www.npmjs.com/package/homebridge-ds18b20)
* [homebridge-dht-sensor](https://www.npmjs.com/package/homebridge-dht-sensor)
* [homebridge-dht](https://www.npmjs.com/package/homebridge-dht)

## Future plans
- Add support for pressure sensor (this is already somewhat supported, but you can't see it in the Home app). Will try to get the Home+ 5 app which supposedly supports both VOC and Pressure sensor displays
- Add support for VOC sensor

## License

MIT
