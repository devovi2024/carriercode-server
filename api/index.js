const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

// ================= MIDDLEWARE =================
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Carrier Code API Running",
  });
});

// ================= DB CONNECTION =================
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.h6qghpe.mongodb.net/carrierCode?retryWrites=true&w=majority`;

let client;
let db;
let jobsCollection;
let applicationCollection;

async function connectDB() {
  if (db) return db;

  client = new MongoClient(uri, {
    serverApi: ServerApiVersion.v1,
  });

  await client.connect();

  db = client.db("carrierCode");

  jobsCollection = db.collection("jobs");
  applicationCollection = db.collection("applications");

  return db;
}

// ================= JOBS =================
app.get("/jobs", async (req, res) => {
  try {
    await connectDB();

    const email = req.query.email;
    const query = email ? { hr_email: email } : {};

    const jobs = await jobsCollection.find(query).toArray();
    res.send(jobs);
  } catch (err) {
    res.status(500).send({ error: "Jobs fetch failed" });
  }
});

app.get("/jobs/:id", async (req, res) => {
  try {
    await connectDB();

    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid ID" });
    }

    const job = await jobsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!job) {
      return res.status(404).send({ message: "Not found" });
    }

    res.send(job);
  } catch (err) {
    res.status(500).send({ error: "Job fetch failed" });
  }
});

app.post("/jobs", async (req, res) => {
  try {
    await connectDB();

    const result = await jobsCollection.insertOne(req.body);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: "Job create failed" });
  }
});

// ================= APPLICATIONS =================
app.post("/applications", async (req, res) => {
  try {
    await connectDB();

    const result = await applicationCollection.insertOne(req.body);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: "Apply failed" });
  }
});

app.get("/applications", async (req, res) => {
  try {
    await connectDB();

    const email = req.query.email;
    const query = email ? { applicant: email } : {};

    const apps = await applicationCollection.find(query).toArray();

    for (let item of apps) {
      if (ObjectId.isValid(item.jobId)) {
        const job = await jobsCollection.findOne({
          _id: new ObjectId(item.jobId),
        });

        if (job) {
          item.company = job.company;
          item.title = job.title;
          item.company_logo = job.company_logo;
        }
      }
    }

    res.send(apps);
  } catch (err) {
    res.status(500).send({ error: "Applications fetch failed" });
  }
});

// ================= EXPORT =================
module.exports = serverless(app);