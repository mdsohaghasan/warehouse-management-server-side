const express = require('express')
const app = express()
var cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())


// MONGODB CONNECTION

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fb0jm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// DATABASE CONNECTION
async function run() {
    try {
        await client.connect();
        const inventoryCollection = client.db('warehouse').collection('Items');
        const myCollection = client.db('warehouse').collection('MyItems');
        console.log('Database Connect Hoise')

        // PRODUCT MYITEM ALL LOAD 
        app.get('/MyItems', async (req, res) => {
            const query = {};
            const cursor = inventoryCollection.find(query);
            const items = await cursor.toArray();
            res.send(items)
        });

        // PRODUCT ITEM ALL LOAD 
        app.get('/Items', async (req, res) => {
            const query = {};
            const cursor = inventoryCollection.find(query);
            const items = await cursor.toArray();
            res.send(items)
        });

        // PRODUCT ITEM SINGLE LOAD
        app.get('/Items/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const items = await inventoryCollection.findOne(query);
            res.send(items);
        });

        // PRODUCT ITEM SINGLE POST
        app.post('/Items', async (req, res) => {
            const newProduct = req.body;
            const result = await inventoryCollection.insertOne(newProduct);
            res.send(result)
        })

        // PRODUCT ITEM SINGLE UPDATE 
        app.put('/Items/:id', async (req, res) => {
            const id = req.params.id;
            const updateUser = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updateUser.name,
                    price: updateUser.price,
                    description: updateUser.description
                }
            };
            const result = await inventoryCollection.updateOne(filter, updateDoc, options);
            req.send(result)
        });

        // PRODUCT ITEM SINGLE DELETE
        app.delete('/Items/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await inventoryCollection.deleteOne(query);
            res.send(result);
        });



    }
    finally {

    }

}

run().catch(console.dir);

// ROOT ENDPOINT 
app.get('/', (req, res) => {
    res.send(' Hello From Warehouse Server !')
})

// PORT
app.listen(port, () => {
    console.log(`listening  on port ${port}`)
})



