## SimpleAPITest
Welcome to world's simple and fastest REST API test framework. 

### First see the demo DEMO
[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/eESvklwGmCk/0.jpg)](https://www.youtube.com/watch?v=eESvklwGmCk)

### Why i build this?
Genarraly, people hate writing test case as it's boaring and needs some effect.
I beleave on a test frameworks which should take .0001% effots to test comparing to devlop the same feature. That's why I build this fremework. 

### How to install ?
```
sudo npm install simpleapitest -g
sudo npm update simpleapitest -g
```
This comamnd will install the script `simpleapitest` in the bin.

### Writing a test case.
Just create a test file as put the test case. Each line of taht file indicate one test case - very clear and super concise. 

A sample testcase looks like:
```
GET  => http://{server}/api/test0/test => 404 - We have not yet support this api
POST => http://{server}/api/test0/create => {"name":"dip","count":1} => success

```
As you can see, we can test GET and POST call in a single line. 
In case of GET call, the test case looks like :
```GET => <URL> => <Expected Output Substring>.```
In case of POST call, the test case looks like :
```POST => <URL> => <POST DATA> => <Expected Output Substring>.```
 
### Setup and execute.
Some test case rquire somesetup, like you can only make find only after inserting some entry. We might need to id which is returned by the setup call to test the update rest API.
You can user named RE to collect the entry. You can start with a bang(!) to indicate a setup call - not really a test call. 

Here is an example:
```
!POST => http://{server}/api/test0/create => {"name":"dip","count":1} => "_id":"(?<id>.*)"
GET => http://{server}/api/test0/find?id={id}  => Find successfully with 1 items
```
In the above example, we are inserting an item in the table and collecting the id. and In the test call, we are passing the id as {id} which is return by the setup call. Also note that, i ahve used a ! sign in the setup call. 

### Run test case:
once you have write testcase, you can execute it easily like:
```
simpleapitest -s simplestore1.herokuapp.com  -f ./sample.txt
```
