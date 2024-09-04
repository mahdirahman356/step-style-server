const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


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
    const paymentsCollection = database.collection("payments");
    
    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorisation) {
        return res.status(401).send({ message: "unauthorise access" })
      }
      const token = req.headers.authorisation.split(' ')[1]
      console.log("from verify token", token)
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorise access" })
        }
        req.decoded = decoded
        next()
      })

    }


    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      console.log(user)
      const isAdmin = user?.role === "admin"
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" })
      }
      next()
    }
    
    // jwt
    app.post("/jwt", async(req, res) => {
        const user = req.body
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1h'
        })
        res.send({token})
    })


    // Shoes related
    app.get("/shoes", async (req, res) => {
      const search = req.query.search
      const brand = req.query.brand


      let query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' }, },
        ];
      }

      if (brand) {
        query.$or = [
          { brand: { $regex: brand, $options: 'i' }, },
        ];
      }

      const result = await shoesCollection.find(query).toArray()
      res.send(result)
    })
    app.get("/shoes-details/:id",  async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await shoesCollection.find(query).toArray()
      res.send(result)
    })

    app.post("/shoes", verifyToken, verifyAdmin,  async (req, res) => {
      const shoes = req.body
      const result = await shoesCollection.insertOne(shoes)
      res.send(result)
    })

    app.put("/shoes-update/:id", verifyToken, verifyAdmin,  async (req, res) => {
      const shoes = req.body
      const id = req.params.id
      const shoesId = { _id: new ObjectId(id) }
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          name: shoes.name,
          price: shoes.price,
          image: shoes.image,
          brand: shoes.brand,
          description: shoes.description,
          size: shoes.size,
          color: shoes.color,
          category: shoes.category
        }
      }

      const result = await shoesCollection.updateOne(shoesId, updateDoc, options)
      res.send(result)
    })

    app.delete("/shoes-delete/:id", verifyToken, verifyAdmin,  async (req, res) => {
      const id = req.params.id
      const shoesId = { _id: new ObjectId(id) }
      const result = await shoesCollection.deleteOne(shoesId)
      res.send(result)
    })

    // user related
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email
      console.log(req.decoded, "decoded")
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === "admin"
      }
      res.send({ admin })
    })

    app.get("/users/email/:email", async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await usersCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query)
      if(existingUser) {
        res.send({message: "user already exist"})
      }
      else{
        const result = await usersCollection.insertOne(user)
      res.send(result)
      }
    })

    app.put('/user-update/:id', verifyToken,  async (req, res) => {
      const user = req.body
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: user.name,
          image: user.image,
          location: user.location,
          contactNumber: user.contactNumber
        }
      }

      const result = await usersCollection.updateOne(filter, updateDoc, options)
      res.send(result)
    })

    app.patch("/user-admin/:id", verifyToken, verifyAdmin,  async(req, res) => {
          const id = req.params.id
          const userId = {_id: new ObjectId(id)}
          const updateDoc = {
             $set: {
              role: "admin"
             }
          }
          const result = await usersCollection.updateOne(userId, updateDoc)
          res.send(result)
    })


    // Order related
    app.get("/order", verifyToken, verifyAdmin,  async (req, res) => {
      const result = await ordersCollection.find().toArray()
      res.send(result)
    })

    app.get("/order/:id", verifyToken, verifyAdmin,  async (req, res) => {
      const id = req.params.id
      const orderId = { _id: new ObjectId(id) }
      const result = await ordersCollection.findOne(orderId)
      res.send(result)
    })

    app.get("/order/email/:email",  async (req, res) => {
      const email = req.params.email
      const orderEmail = { email: email }
      const result = await ordersCollection.find(orderEmail).toArray()
      res.send(result)
    })

    app.post("/order", verifyToken,  async (req, res) => {
      const order = req.body
      console.log(order)
      const result = await ordersCollection.insertOne(order)
      res.send(result)
    })

    app.delete("/order-delete/:id", verifyToken,  async (req, res) => {
      const id = req.params.id
      const orderDelete = { _id: new ObjectId(id) }
      const result = await ordersCollection.deleteOne(orderDelete)
      res.send(result)
    })

    app.patch("/order-isPaid/:id", verifyToken,  async (req, res) => {
      const id = req.params.id
      const orderId = { _id: new ObjectId(id) }
      const paid = req.body
      const updateDoc = {
        $set: {
          isPaid: paid.isPaid
        }
      }
      const result = await ordersCollection.updateOne(orderId, updateDoc)
      res.send(result)
    })

    app.patch("/order-confirm/:id", verifyToken, verifyAdmin,  async (req, res) => {
      const id = req.params.id
      const orderId = { _id: new ObjectId(id) }
      const confirm = req.body;
      const updateDoc = {
        $set: {
          confirmation: confirm.confirmation
        }
      }

      const result = await ordersCollection.updateOne(orderId, updateDoc)
      res.send(result)
    })

    // payments

    app.get("/payments",  async (req, res) => {
      const result = await paymentsCollection.find().toArray()
      res.send(result)
    })

    app.get("/payments/:email", verifyToken,  async (req, res) => {
      const email = req.params.email
      const payments = { email: email }
      const result = await paymentsCollection.find(payments).toArray()
      res.send(result)
    })

    app.post("/payments", verifyToken,  async (req, res) => {
      const payment = req.body
      const result = await paymentsCollection.insertOne(payment)
      res.send(result)
    })

    // payment intent

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })

    // stats
    app.get("/admin-stats", async(req, res) => {
         const users = await usersCollection.estimatedDocumentCount()
         const products = await shoesCollection.estimatedDocumentCount()
         const orders = await ordersCollection.estimatedDocumentCount()
         const payments = await paymentsCollection.find().toArray()
         const revenue = payments.reduce((total, payment) => total + payment.productPrice, 0)
         res.send({
          users,
          products,
          orders,
          revenue
         })
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