This repo contains **2** main projects:

- **360 image uploader**
- **RabbitMQ server and consumer**

## 360 image uploader

###Features

- Preview local and server images by Magic 360
- Resized and upload images to SeaweedFS server
- Notify **RabbitMQ server** after upload success

###Usage Build project by

```sh
npm run build:webpack
```

After build completed, there should be a js file`imgUpload.js`in the
path`dist/lib`.  
Then import it in your html page(together with`magic360.js`for preview):

```html
<script type="text/javascript" src="magic360.js"></script>
<script type="text/javascript" src="imgUpload.js"></script>
```

After that call js function

```js
reactImgUpload.renderImgUpload(props, elementId);
```

with a html element of id`elementId`.

Then the **360 image uploader** is ready to go.

###Props format

| Key                |       Required?       |     Type      | Description                                             |
| ------------------ | :-------------------: | :-----------: | ------------------------------------------------------- |
| imgServer          |         true          |    string     | SeaweedFS server                                        |
| quality            |         true          |    object     | Image quality after resized                             |
| quality.normal     |         true          |    number     | 0 - 1                                                 |
| quality.large      |         true          |    number     | 0 - 1                                                 |
| mqUrl              |         false         |    string     | RabbitMQ server domain, no notification if not provided |
| <em>is2ndHand</em> |         true          |    boolean    | Going to upload 2nd hand image or not                   |
| selectedSku        |  <em>is2ndHand</em>   |  [sku](#sku)  | Default selected sku                                    |
| serial             |  <em>is2ndHand</em>   |    string     | For 2nd hand stock confirmation only                    |
| skus               | !<em>(is2ndHand)</em> | [sku](#sku)[] | List of sku, for selecting which sku images to upload   |

<a name="sku"></a> ###sku format

| Key    | Required? |  Type  | Description                                        |
| ------ | :-------: | :----: | -------------------------------------------------- |
| sku    |   true    | string | sku, product reference                             |
| imgUrl |   false   | string | sku example image url, will display for comparsion |

####Example:

1. Normal mode where user **selected** sku`50519/1`(sku cannot be changed):

```json
{
  "imgServer": "http://imagedev.watchshopping.com/360",
  "quality": {
    "normal": 1,
    "large": 1
  },

  "mqUrl": "http://172.16.2.78:7999/rmq/img360",

  "is2ndHand": false,
  "selectedSku": { "sku": "50519/1" },
  "skus": [
    { "sku": "50519/1", "imgUrl": null },
    { "sku": "50515/2", "imgUrl": null },
    { "sku": "50515/1", "imgUrl": "/public/images/product/IMAGE/30/315100" },
    { "sku": "testing", "imgUrl": null },
    ...
  ]
}
```

2. Normal mode where user select sku by themselves:

```json
{
  ...

  "is2ndHand": false,
  "skus": [
    { "sku": "50519/1", "imgUrl": null },
    { "sku": "50515/2", "imgUrl": null },
    { "sku": "50515/1", "imgUrl": "/public/images/product/IMAGE/30/315100" },
    { "sku": "testing", "imgUrl": null },
    ...
  ]
}
```

3. 2nd hand mode where user **selected** sku`50515/1_@_6953NWQO`with
   serial`CCC02002`

```json
{
  ...

  "is2ndHand": true,
  "selectedSku": { "sku": "50515/1_@_6953NWQO", "imgUrl": "/public/images/product/IMAGE/30/315100" },
  "serial": "CCC02002"
}

```

---

## RabbitMQ server and consumer

###RabbitMQ Server

- Receive http requests of upload success from **360 image uploader**

####API

- **POST**: /rmq/img360 - publish the request body to RabbitMQ - store the
  request body to a json file by _lowdb_
  - request body example:

```json
{
 "folder":"50515/1",
 "imgs":[
 	"01-large.jpg","01.jpg","02-large.jpg","02.jpg","03-large.jpg","03.jpg","04-large.jpg","04.jpg",
	...
 	]
}
```

- **GET**: /rmq/img360 - retrieve the list of success from the json file

```json
[
	{
	 "folder":"50515/1",
	 "imgs":[
	 	"01-large.jpg","01.jpg","02-large.jpg","02.jpg","03-large.jpg","03.jpg","04.jpg-large","04.jpg",
		...
	 	]
	},
	{
	 "folder":"50519/1",
	 "imgs":[
	 	"01-large.jpg","01.jpg","02-large.jpg","02.jpg","03-large.jpg","03.jpg","04-large.jpg","04.jpg",
		...
	 	]
	},
	...
]
```

- **GET**: /rmq/img360/sku/:sku - retrieve individual sku success from the json
  file

response example:

```json
[
  "01-large.jpg",
  "01.jpg",
  "02-large.jpg",
  "02.jpg",
  "03-large.jpg",
  "03.jpg",
  "04-large.jpg",
  "04.jpg",
  "05-large.jpg",
  "05.jpg",
  "06-large.jpg",
  "06.jpg",
  "07-large.jpg",
  "07.jpg",
  "08-large.jpg",
  "08.jpg",
  "09-large.jpg",
  "09.jpg",
  "10-large.jpg",
  "10.jpg",
  "11-large.jpg",
  "11.jpg",
  "12-large.jpg",
  "12.jpg"
]
```

- **GET**: /rmq/img360/list - retrieve the list of success sku

response example:

```json
["50515/1", "50515/2", "testing"]
```

###RabbitMQ Consumer

- example of consumer to listen message from **RabbitMQ Server**

## How to convert to new data format:

1. Stop running /mq/server/src/index.js
2. Backup the exiting img360.json
3. node run the convert.js file inside /mq/server
