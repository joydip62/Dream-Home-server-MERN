const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
    const propertiesCollection = client
      .db("dreamHomeDB")
      .collection("properties");
    const reviewsCollection = client.db("dreamHomeDB").collection("reviews");
    const wishListsCollection = client
      .db("dreamHomeDB")
      .collection("wishLists");
    const makeOffersCollection = client
      .db("dreamHomeDB")
      .collection("makeOffers");

    // jwt token api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized" });
        }
        req.decoded = decoded;
        next();
      });
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    const verifyAgent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAgent = user?.role === "agent";
      if (!isAgent) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // =============================== admin ======================================
    // admin related api
    app.get("/users/role/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      let agent = false;
      if (user) {
        admin = user?.role === "admin";
        agent = user?.role === "agent";
      }

      const userData = await usersCollection.findOne({ email });

      res.send({ admin, agent, userData });
    });

    // agent related api
    // app.get("/users/agent/:email", verifyToken, async (req, res) => {
    //   const email = req.params.email;
    //   if (email !== req.decoded.email) {
    //     return res.status(403).send({ message: "forbidden access" });
    //   }
    //   const query = { email: email };
    //   const user = await usersCollection.findOne(query);
    //   let agent = false;
    //   if (user) {

    //   }
    //   res.send({ agent });
    // });

    app.get("/users", verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      // if user already exist
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.patch("/users/role/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const options = { upsert: true };
      const filter = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          role: data.role,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedData,
        options
      );
      res.send(result);
    });
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // properties related api
    // verified property
    app.patch(
      "/properties/verified/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedData = {
          $set: {
            status: "verified",
          },
        };
        const result = await propertiesCollection.updateOne(
          filter,
          updatedData
        );
        res.send(result);
      }
    );

    // rejected property
    app.patch(
      "/properties/rejected/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedData = {
          $set: {
            status: "rejected",
          },
        };
        const result = await propertiesCollection.updateOne(
          filter,
          updatedData
        );
        res.send(result);
      }
    );

    // ================================ agent ====================================
    app.get("/properties", verifyToken, async (req, res) => {
      const result = await propertiesCollection.find().toArray();
      res.send(result);
    });
    app.post("/properties", verifyToken, verifyAgent, async (req, res) => {
      const property = req.body;
      const result = await propertiesCollection.insertOne(property);
      res.send(result);
    });
    app.get("/properties/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });
    app.patch("/properties/:id", verifyToken, verifyAgent, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const options = { upsert: true };
      const filter = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          propertyTitle: data.propertyTitle,
          propertyLocation: data.propertyLocation,
          propertyPrice: data.propertyPrice,
          propertyImage: data.propertyImage,
        },
      };
      const result = await propertiesCollection.updateOne(
        filter,
        updatedData,
        options
      );
      res.send(result);
    });
    app.delete(
      "/properties/:id",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await propertiesCollection.deleteOne(query);
        res.send(result);
      }
    );

    // =========================== user ===================================
    // user review
    app.post("/reviews", verifyToken, async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });
    app.get("/reviews", verifyToken, async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });
    app.delete("/reviews/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    });

    // user wishlist
    app.post("/wishLists", verifyToken, async (req, res) => {
      const wishList = req.body;
      const result = await wishListsCollection.insertOne(wishList);
      res.send(result);
    });
    app.get("/wishLists", verifyToken, async (req, res) => {
      const result = await wishListsCollection.find().toArray();
      res.send(result);
    });

    app.get("/wishLists/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishListsCollection.findOne(query);
      res.send(result);
    });

    app.delete("/wishLists/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishListsCollection.deleteOne(query);
      res.send(result);
    });

    // make an offer api
    app.post("/makeOffers", verifyToken, async (req, res) => {
      const makeOffer = req.body;
      const result = await makeOffersCollection.insertOne(makeOffer);
      res.send(result);
    });
    app.get("/makeOffers", verifyToken, async (req, res) => {
      const result = await makeOffersCollection.find().toArray();
      res.send(result);
    });
    app.delete("/makeOffers/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await makeOffersCollection.deleteOne(query);
      res.send(result);
    });
    // ====================================================================
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
