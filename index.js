const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Carrier Code Cooking')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.h6qghpe.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

let jobsCollection
let applicationCollection

async function run() {
  try {
    await client.connect()
    const db = client.db('carrierCode')
    jobsCollection = db.collection('jobs')
    applicationCollection = db.collection('applications')

    // All Jobs
    app.get('/jobs', async (req, res) => {
      const result = await jobsCollection.find().toArray()
      res.send(result)
    })

    // Job Details
    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id
      const result = await jobsCollection.findOne({ _id: new ObjectId(id) })
      res.send(result)
    })

    // Apply Job
    app.post('/applications', async (req, res) => {
      const { jobId, applicant } = req.body

      // Prevent duplicate application
      const exists = await applicationCollection.findOne({ jobId, applicant })
      if (exists) {
        return res.status(400).send({ message: 'Already applied for this job' })
      }

      const result = await applicationCollection.insertOne({ jobId, applicant, status: 'Applied' })
      res.send(result)
    })

    // My Applications
    app.get('/myApplications', async (req, res) => {
      const email = req.query.email
      const result = await applicationCollection.find({ applicant: email }).toArray()

      for (const application of result) {
        const job = await jobsCollection.findOne({ _id: new ObjectId(application.jobId) })
        if (job) {
          application.company = job.company
          application.title = job.title
          application.company_logo = job.company_logo
          application.location = job.location
        }
      }

      res.send(result)
    })

    await client.db('admin').command({ ping: 1 })
    console.log('MongoDB connected')
  } catch (err) {
    console.log(err)
  }
}

run()

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
