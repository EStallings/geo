# for prod
# mongoimport --uri mongodb://heroku_zfbs5tv5:nmq8je4c08keut94pvpkggdhva@ds127944.mlab.com:27944/heroku_zfbs5tv5 -c ip_data --type csv --file GeoLite2-City-Blocks-IPv4.csv --headerline


# for local
# mongoimport -d geo -c ip_data --type csv --file GeoLite2-City-Blocks-IPv4.csv --headerline