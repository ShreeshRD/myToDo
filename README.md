Demo website:
Note - Refreshing the page will reset the data.
https://shreeshrd.github.io/myToDo/

Installation notes:
Front end and backend interact through a REST API.
Front end is a clone of a popular To Do list app. Run it with:
```
npm i
npm start
```
Backend developed with Spring-Boot and Jakarata API to connect to MySQL.

You need to have MySQL instance running with an existing database called tododb.
Change your specific username and password in this file:
 - Backend-SpringBoot/src/main/resources/application.properties
