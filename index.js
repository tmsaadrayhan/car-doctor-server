const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.5vqlaat.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  console.log(req.headers.authorization);
  if (!req.headers.authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  jwt.verify(
    req.headers.authorization.split(" ")[1],
    process.env.ACCESS_TOKEN_SECRET,
    (error, decoded) => {
      if (error)
        return res
          .status(403)
          .send({ error: true, message: "unauthorized access" });
      req.decoded = decoded;
      next();
    }
  );
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    // Send a ping to confirm a successful connection

    const servicesCollection = client.db("car-doctor").collection("services");
    const bookingCollection = client.db("car-doctor").collection("bookings");
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
      });
      res.send({ token });
    });

    app.get("/services", async (req, res) => {
      console.log(req.query.search);
      res.send(
        await servicesCollection
          .find({title: {$regex: req.query.search, $options: "i"}}, { sort: { price: req.query.sort === "asc" ? 1 : -1 } })
          .toArray()
      );
    });
    app.get("/services/:id", async (req, res) => {
      res.send(
        await servicesCollection.findOne(
          { _id: new ObjectId(req.params.id) },
          { projection: { title: 1, price: 1, img: 1, service_id: 1 } }
        )
      );
    });

    app.get("/bookings", verifyJWT, async (req, res) => {
      if (req.decoded.email !== req.query.email) {
        return res.status(403).send({ error: 1, message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      res.send(await bookingCollection.find(query).toArray());
    });

    app.post("/bookings", async (req, res) => {
      res.send(await bookingCollection.insertOne(req.body));
    });
    app.patch("/bookings/:id", async (req, res) => {
      res.send(
        await bookingCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { status: req.body.status } }
        )
      );
    });
    app.delete("/bookings/:id", async (req, res) => {
      res.send(
        await bookingCollection.deleteOne({ _id: new ObjectId(req.params.id) })
      );
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car-doctor-server is running!");
});

app.listen(port, () => {
  console.log(`car-doctor-server is listening on port ${port}`);
});

module.exports = app;
