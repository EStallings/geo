from flask import Flask
from flask import request
from bson.json_util import dumps
from pymongo import MongoClient
import json

client = MongoClient('localhost:27017')
db = client.geo
app = Flask(__name__)

PAGE_SIZE = 100

@app.route("/ip", methods = ['POST'])
def add_ip():
	try:
		data = json.loads(request.data)
		status = db.ip_data.insert_one(data)
		return app.response_class(
			status=200,
		)
	except Exception, e:
		return app.response_class(
			response=str(e),
			status=500
		)

@app.route("/ip/spatial", methods = ['GET'])
def get_ip_data_spatial():
	try:
		page_size = int(request.args.get('count', PAGE_SIZE))
		page = int(request.args.get('page', 1))
		skip =  (page-1) * page_size

		min_lon = (float(request.args.get('min_lon')))
		max_lon = (float(request.args.get('max_lon')))
		min_lat = (float(request.args.get('min_lat')))
		max_lat = (float(request.args.get('max_lat')))
		query = {
			'longitude': { '$ne': '', '$gte': min_lon, '$lt': max_lon },
			'latitude':  { '$ne': '', '$gte': min_lat, '$lt': max_lat }
		}
		print(query)
		print(skip)
		print(page_size)
		ip_data = list(db.ip_data.find(query).skip(skip).limit(page_size))
		return app.response_class(
			response=dumps(ip_data),
			status=200,
			mimetype='application/json'
		)
	except Exception, e:
		return app.response_class(
			response=str(e),
			status=500
		)

@app.route("/ip/spatial/count", methods = ['GET'])
def get_ip_count_spatial():
	try:
		min_lon = (float(request.args.get('min_lon')))
		max_lon = (float(request.args.get('max_lon')))
		min_lat = (float(request.args.get('min_lat')))
		max_lat = (float(request.args.get('max_lat')))

		# We filter out any empty long/lat since they just end up being out off the coast of Africa (0,0)
		query = {
			'longitude': { '$ne': '', '$gte': min_lon, '$lt': max_lon },
			'latitude':  { '$ne': '', '$gte': min_lat, '$lt': max_lat }
		}

		page_size = int(request.args.get('count', PAGE_SIZE))
		page = int(request.args.get('page', 1))
		ip_data = db.ip_data.count(query)
		return app.response_class(
			response=dumps(ip_data),
			status=200,
			mimetype='application/json'
		)
	except Exception, e:
		return app.response_class(
			response=str(e),
			status=500
		)


@app.route("/ip/count", methods = ['GET'])
def get_ip_count():
	try:
		ip_data = db.ip_data.count()
		return app.response_class(
			response=dumps(ip_data),
			status=200,
			mimetype='application/json'
		)
	except Exception, e:
		return app.response_class(
			response=str(e),
			status=500
		)

@app.route("/ip/naive", methods = ['GET'])
def get_ip_data_naive():
	try:
		page_size = int(request.args.get('count', PAGE_SIZE))
		page = int(request.args.get('page', 1))
		ip_data = list(db.ip_data.find().skip( (page-1) * page_size).limit(page_size))
		return app.response_class(
			response=dumps(ip_data),
			status=200,
			mimetype='application/json'
		)
	except Exception, e:
		return app.response_class(
			response=str(e),
			status=500
		)

# send CORS headers
@app.after_request
def after_request(response):
	response.headers.add('Access-Control-Allow-Origin', '*')
	if request.method == 'OPTIONS':
		response.headers['Access-Control-Allow-Methods'] = 'DELETE, GET, POST, PUT'
		headers = request.headers.get('Access-Control-Request-Headers')
		if headers:
			response.headers['Access-Control-Allow-Headers'] = headers
	return response

