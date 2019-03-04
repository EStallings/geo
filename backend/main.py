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

@app.route("/ip", methods = ['GET'])
def get_ip_data():
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

