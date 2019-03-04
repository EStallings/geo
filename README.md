# geo

##Quick overview:

Frontend: 
	- Angular 7
		- Compiled in Heroku using node
	- leaflet and leaflet.heat
	- mapbox

Backend: 
	- Flask
		- Running in Heroku on Gunicorn
	- MongoDB
		- Running in Heroku via mLab

##Disclosures:
Prior to this project, I had never used Heroku, Leaflet, or Mapbox. 
I have used Flask and Angular, but never (professionally, at least) from scratch like this

##General description:

Frontend uses leaflet to draw a map, map data from mapbox, and leaflet.heat is used to easily draw heatmap on top

Frontend uses pagination to call backend repeatedly in batches of 500 (I experimented with higher and lower; higher felt too chunky, and lower just caused unnecessary lag from too many requests).

Backend uses MongoDB to fetch IP addresses.

##Possible areas of improvement:
MongoDB has a positional querying system built in that could be leveraged pretty easily, but it would require
modifying the CSV data by adding a BSON geo coord data type as an embedded document. This may have very good 
performance, since you can index this, and all logic is done on the mongo server itself.

Indexing the fields for longitude and latitude would help in either case

Directly streaming a Mongo cursor to the client is very fast and would eliminate much of the client-side paging
logic. I've done this before in Node/Express; didn't have the time to figure out how to do it with Flask.

The CSV file isn't on the server because of Github size limits (188mb > 100mb), which is part of what prompted 
me to use a database in the first place. If data has to be stored in a CSV, or originates in it, you can have 
a cron job that automatically looks and loads new data periodically. There might also be existing services for
that kind of thing

Adding a limit to the number of pages/elements that get retrieved would be a good idea for a real system,
I decided to leave it out deliberately because it was interesting to see it slow down (I think because of the
heatmap itself).

##Acknowledged Limitations:
A major limitation of the way I did this is that the map may have to redraw stuff currently on-screen,
especially if you zoom in or out. This is because if we start pulling data in based on our current bounds,
instead of the cached, padded bounds, we change the query being sent to the database, and therefore,
our paging is no longer reliably unique. Doing this could result in receiving the same data many times, or
missing big chunks of it. The only real workaround is to track each point individually on the client, and check for each incoming piece of data if it has already been received.

