const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

// ================= MIDDLEWARE =================
app.use(
  cors({
    origin: "*", // production এ চাইলে specific domain দিতে পারো
    credentials: true,
  })
);
app.use(express.json());

// ================= ROOT =================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Carrier Code API is live",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date().toISOString(),
  });
});

// ================= DATABASE =================
const uri = `mongodb+srv://${encodeURIComponent(
  process.env.DB_USER
)}:${encodeURIComponent(
  process.env.DB_PASSWORD
)}@cluster0.h6qghpe.mongodb.net/?retryWrites=true&w=majority`;

let client;
let db;
let jobsCollection;
let applicationCollection;

async function connectDB() {
  if (db) return db;

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  db = client.db("carrierCode");

  jobsCollection = db.collection("jobs");
  applicationCollection = db.collection("applications");

  return db;
}

// ================= JOB ROUTES =================
app.get("/jobs", async (req, res) => {
  try {
    await connectDB();

    const email = req.query.email;
    const query = email ? { hr_email: email } : {};

    const jobs = await jobsCollection.find(query).toArray();
    res.send(jobs);
  } catch (error) {
    res.status(500).send({ error: "Failed to get jobs" });
  }
});

app.get("/jobs/:id", async (req, res) => {
  try {
    await connectDB();

    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid job id" });
    }

    const job = await jobsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!job) {
      return res.status(404).send({ message: "Job not found" });
    }

    res.send(job);
  } catch (error) {
    res.status(500).send({ error: "Failed to get job" });
  }
});

app.post("/jobs", async (req, res) => {
  try {
    await connectDB();

    const result = await jobsCollection.insertOne(req.body);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to create job" });
  }
});

// ================= APPLICATION ROUTES =================
app.post("/applications", async (req, res) => {
  try {
    await connectDB();

    const result = await applicationCollection.insertOne(req.body);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to apply" });
  }
});

app.get("/applications", async (req, res) => {
  try {
    await connectDB();

    const email = req.query.email;
    const query = email ? { applicant: email } : {};

    const applications = await applicationCollection.find(query).toArray();

    // join job info
    for (const item of applications) {
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

    res.send(applications);
  } catch (error) {
    res.status(500).send({ error: "Failed to get applications" });
  }
});

// ================= EXPORT =================
module.exports = serverless(app);