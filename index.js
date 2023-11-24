const express = require("express");
const app = express();
const cors = require("cors");

const port = process.env.PORT || 5000;
require("dotenv").config();


// middleware
app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jucoem4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      // await client.connect();
      // Get the database and collection on which to run the operation
      await client.db("admin").command({ ping: 1 });

      // db collections
      const usersCollection = client.db("dreamHomeDB").collection("users");
      // admin related api
      app.get('/users', async (req, res) => {
        const result = await usersCollection.find().toArray();
        res.send(result);
      })
      app.post('/users', async (req, res) => {
        const user = req.body;
        // if user already exist
        const query = { email: user.email };
        const existingUser = await usersCollection.findOne(query);
        if (existingUser) {
          return res.send({message: 'user already exist', insertedId: null})
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      })
      app.delete('/users/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      })
      console.log(
        "Pinged your deployment. You successfully connected to MongoDB!"
      );
    } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// port
app.listen(port, () => {
  console.log(`dream home server host on port ${port}`);
});
