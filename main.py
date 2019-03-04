import json
import os
from flask import Flask, request, Response
from bson.json_util import dumps
from pymongo import MongoClient

mongo_connection = {
	'local': 'localhost:27017',
	'heroku': 'mongodb://heroku_zfbs5tv5:nmq8je4c08keut94pvpkggdhva@ds127944.mlab.com:27944/heroku_zfbs5tv5'
}
mongo_database = {
	'local': 'geo',
	'heroku': 'heroku_zfbs5tv5'
}
application = Flask(__name__, static_url_path='', static_folder='dist')
PAGE_SIZE = 100

def getConfig():
	return os.environ.get('FLASK_CONFIG', 'local')

def getConnection():
	client = MongoClient(mongo_connection.get(getConfig()))
	db = client[mongo_database.get(getConfig())]
	return db

def buildSpatialQuery(args):
	min_lon = (float(args.get('min_lon')))
	max_lon = (float(args.get('max_lon')))
	min_lat = (float(args.get('min_lat')))
	max_lat = (float(args.get('max_lat')))
	query = {
		'longitude': { '$ne': '', '$gte': min_lon, '$lt': max_lon },
		'latitude':  { '$ne': '', '$gte': min_lat, '$lt': max_lat }
	}
	project = { 'longitude':1, 'latitude':1 }
	return query, project

@application.route("/config")
def config():
	return getConfig()

@application.route('/')
def index():
	return application.send_static_file('index.html')

@application.route('/<path:path>')
def static_proxy(path):
	# send_static_file will guess the correct MIME type
	return application.send_static_file(path)

@application.route("/ip", methods = ['POST'])
def add_ip():
	try:
		data = json.loads(request.data)
		status = getConnection().ip_data.insert_one(data)
		return application.response_class(
			status=200,
		)
	except Exception, e:
		return application.response_class(
			response=str(e),
			status=500
		)

@application.route("/ip/spatial", methods = ['GET'])
def get_ip_data_spatial():
	try:
		page_size = int(request.args.get('count', PAGE_SIZE))
		page = int(request.args.get('page', 1))
		skip =  (page-1) * page_size
		query, project = buildSpatialQuery(request.args)
		ip_data = getConnection().ip_data.find(query, project).skip(skip).limit(page_size)
		return application.response_class(
			response=dumps(ip_data),
			status=200,
			mimetype='application/json'
		)
	except Exception, e:
		return application.response_class(
			response=str(e),
			status=500
		)

@application.route("/ip/spatial/count", methods = ['GET'])
def get_ip_count_spatial():
	try:
		page_size = int(request.args.get('count', PAGE_SIZE))
		page = int(request.args.get('page', 1))
		query, project = buildSpatialQuery(request.args)
		ip_data = getConnection().ip_data.count(query)
		return application.response_class(
			response=dumps(ip_data),
			status=200,
			mimetype='application/json'
		)
	except Exception, e:
		return application.response_class(
			response=str(e),
			status=500
		)

@application.route("/ip/count", methods = ['GET'])
def get_ip_count():
	try:
		ip_data = getConnection().ip_data.count()
		return application.response_class(
			response=dumps(ip_data),
			status=200,
			mimetype='application/json'
		)
	except Exception, e:
		return application.response_class(
			response=str(e),
			status=500
		)

@application.route("/ip/naive", methods = ['GET'])
def get_ip_data_naive():
	try:
		page_size = int(request.args.get('count', PAGE_SIZE))
		page = int(request.args.get('page', 1))
		ip_data = list(getConnection().ip_data.find().skip( (page-1) * page_size).limit(page_size))
		return application.response_class(
			response=dumps(ip_data),
			status=200,
			mimetype='application/json'
		)
	except Exception, e:
		return application.response_class(
			response=str(e),
			status=500
		)

# send CORS headers
@application.after_request
def after_request(response):
	response.headers.add('Access-Control-Allow-Origin', '*')
	if request.method == 'OPTIONS':
		response.headers['Access-Control-Allow-Methods'] = 'DELETE, GET, POST, PUT'
		headers = request.headers.get('Access-Control-Request-Headers')
		if headers:
			response.headers['Access-Control-Allow-Headers'] = headers
	return response

if __name__ == "__main__":
	application.run()
