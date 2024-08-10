const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rz0kihv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db("ShoesDB");
    const shoesCollection = database.collection("shoes");
    const usersCollection = database.collection("users");
    const ordersCollection = database.collection("orders");
    
    // Shoes related
    app.get("/shoes", async(req, res) => {
        const result = await shoesCollection.find().toArray()
        res.send(result)
    })
    app.get("/shoes-details/:id", async(req, res) => {
        const id = req.params.id
        const query = {_id: new ObjectId(id)}
        const result = await shoesCollection.find(query).toArray()
        res.send(result)
    })

    app.post("/shoes", async(req, res) => {
        const shoes = req.body
        const result = await shoesCollection.insertOne(shoes)
        res.send(result)
    })

    app.delete("/shoes-delete/:id", async(req, res) => {
         const id = req.params.id
         const shoesId = {_id: new ObjectId(id)}
         const result = await shoesCollection.deleteOne(shoesId)
         res.send(result)
    })

    // user related
    app.get("/users", async(req, res) => {
        const result = await usersCollection.find().toArray()
        res.send(result)
    })

    app.get("/users/email/:email", async(req, res) => {
        const email = req.params.email
        const query = {email: email}
        const result = await usersCollection.find(query).toArray()
        res.send(result)
    })

    app.post('/users', async(req, res) => {
        const user = req.body
        const result = await usersCollection.insertOne(user)
        res.send(result)
    })

    app.put('/user-update/:id', async(req, res) => {
        const user = req.body
        const id = req.params.id
        const filter = {_id: new ObjectId(id)}
        const options = { upsert: true };
        const updateDoc = {
          $set:{
            name: user.name,
            image: user.image,
            location: user.location,
            contactNumber: user.contactNumber
          }
        } 

        const result = await usersCollection.updateOne(filter, updateDoc, options)
        res.send(result)
    })

    // Order related
    app.get("/order", async(req, res) => {
        const result = await ordersCollection.find().toArray()
        res.send(result)
    })

    app.get("/order/:id", async(req, res) => {
       const id = req.params.id
       const orderId = {_id: new ObjectId(id)}
       const result = await ordersCollection.findOne(orderId)
       res.send(result)
    })

    app.get("/order/email/:email", async(req, res) => {
         const email = req.params.email
         const orderEmail = {email: email}
         const result = await ordersCollection.find(orderEmail).toArray()
         res.send(result)
    })

    app.post("/order", async(req, res) => {
        const order = req.body
        console.log(order)
        const result = await ordersCollection.insertOne(order)
        res.send(result)
    })

    app.delete("/order-delete/:id", async(req, res) => {
         const id = req.params.id
         const orderDelete = {_id: new ObjectId(id)}
         const result = await ordersCollection.deleteOne(orderDelete)
         res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("Step Style Server")
}) 

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})