const express = require('express')
const jwt = require('jsonwebtoken');
const app = express()
var cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;
const stripePayment = require('stripe')(process.env.STRIPE_PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())


// MONGODB CONNECTION

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.36icl.mongodb.net/?retryWrites=true&w=majority`;

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pajtj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//VERIFY JWT
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

// DATABASE CONNECT
async function run() {
    try {
        await client.connect();
        const usersCollection = client.db('car-manufacturer').collection('users');
        const productsCollection = client.db('car-manufacturer').collection('products');
        const reviewsCollection = client.db('car-manufacturer').collection('reviews');
        const PurchaseInfoCollection = client.db('car-manufacturer').collection('PurchaseInfo');
        const paymentCollection = client.db('car-manufacturer').collection('payments');
        console.log('Database Connect Hoise')

        // working -----------------------

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }

        //--------------//
        // USERS ROUTES //
        //--------------//

        // LOAD USER ON MANAGEUSER PAGE 
        app.get('/manageusers', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        // UPDATE USER INFO MY ACCOUNT PAGE OR SIGNUP PAGE 
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5d' })
            res.send({ result, token });
        });

        // ADMIN EMAIL GET
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const users = await usersCollection.findOne({ email: email });
            const isAdmin = users.role === 'admin';
            res.send({ admin: isAdmin })
        })

        // USER ADMIN MAKING ON MANAGEUSER PAGE BY ADMIN
        app.put('/manageusers/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //------------------------------------//
        // Review GET , POST , DELETE ENDPOINT
        //------------------------------------//

        // Review ITEM LOAD ENDPOINT
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewsCollection.find(query);
            const items = await cursor.toArray();
            res.send(items)
        });

        // LOAD Review  ON MY Review PAGE 
        app.get('/reviews', verifyJWT, async (req, res) => {
            const customerEmail = req.query.customerEmail;
            const decodedEmail = req.decoded.email;
            if (customerEmail === decodedEmail) {
                const query = { customerEmail: customerEmail };
                const reviews = await reviewsCollection.find(query).toArray();
                return res.send(reviews);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }
        });

        // POST Review ON ADD Review PAGE BY USER
        app.post('/reviews', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        });



        //------------------------------------//
        // PRODUCT GET , POST , DELETE ENDPOINT
        //------------------------------------//

        // ALL PRODUCT ITEM LOAD ENDPOINT
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const items = await cursor.toArray();
            res.send(items)
        });

        // PRODUCT DETAILS LOAD ON PURCHASE PAGE
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const ProductInfo = await productsCollection.findOne(query);
            res.send(ProductInfo);
        })

        // POST PRODUCT ON MANAGEPRODUCT PAGE BY ADMIN
        app.post('/products', verifyJWT, async (req, res) => {
            const products = req.body;
            const result = await productsCollection.insertOne(products);
            res.send(result);
        });

        // SPECIPIC PRODUCT DELETE FROM MANAGEPRODUCT PAGE BY ADMIN
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });

        //----------------//
        // ORDERS ENDPOINTS
        //----------------//

        // LOAD ALL ORDER ON MANAGEORDER PAGE FOR ADMIN
        app.get('/PurchaseInfo', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = PurchaseInfoCollection.find(query);
            const items = await cursor.toArray();
            res.send(items)
        });

        // SPECIPIC ORDER DELETE FROM MANAGE ORDER PAGE BY ADMIN
        app.delete('/PurchaseInfo/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await PurchaseInfoCollection.deleteOne(query);
            res.send(result);
        });

        // LOAD ORDER PRODUCT ON MY ORDER PAGE 
        app.get('/PurchaseInfo', verifyJWT, async (req, res) => {
            const customerEmail = req.query.customerEmail;
            // const authorization = req.headers.authorization;
            // console.log('my test', authorization)
            const decodedEmail = req.decoded.email;
            if (customerEmail === decodedEmail) {
                const query = { customerEmail: customerEmail };
                const PurchaseInfo = await PurchaseInfoCollection.find(query).toArray();
                return res.send(PurchaseInfo);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }
        });

        // POST PURCHASE INFO ON PURCHASE PAGE FOR ORDER
        app.post('/PurchaseInfo', async (req, res) => {
            const PurchaseInfo = req.body
            // const exists = await bookingCollection.findOne(query);
            // if (exists) {
            //     return res.send({ success: false, booking: exists })
            // }
            const result = await PurchaseInfoCollection.insertOne(PurchaseInfo)
            res.send(result);
        });

        //----------------//
        // PAYMENT ENDPOINT 
        //----------------//

        // LOAD SINGLE Purchasedetails ON PAYMENT PAGE
        app.get('/PurchaseInfo/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const PurchaseInfo = await PurchaseInfoCollection.findOne(query);
            res.send(PurchaseInfo);
        })

        // STRIPE PAYMENT API
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { Price } = req.body;
            const amount = Price * 100;
            const paymentIntent = await stripePayment.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        // POST PAYMENT INFO ON DATABASE
        app.patch('/PurchaseInfo/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedPurchase = await PurchaseInfoCollection.updateOne(filter, updatedDoc);
            const result = await paymentCollection.insertOne(payment);
            res.send(updatedPurchase);
        })


    }
    finally {

    }

}

run().catch(console.dir);

// ROOT ENDPOINT 
app.get('/', (req, res) => {
    res.send(' Hello From phone plus Server !')
})

// PORT
app.listen(port, () => {
    console.log(`listening  on port ${port}`)
})



