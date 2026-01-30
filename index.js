const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 4000

  //  Middleware

app.use(cors())
app.use(express.json())

  //  Root Route

app.get('/', (req, res) => {
  res.send('Carrier Code Cooking')
})

  //  MongoDB Setup

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.h6qghpe.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

let jobsCollection
let applicationCollection

  //  Run Server

async function run() {
  try {
    await client.connect()

    const db = client.db('carrierCode')
    jobsCollection = db.collection('jobs')
    applicationCollection = db.collection('applications')

    console.log(' MongoDB connected successfully')

          //  JOB APIs
    

    // Get jobs (optionally by HR email)
    app.get('/jobs', async (req, res) => {
      const email = req.query.email
      const query = {}

      if (email) {
        query.hr_email = email
      }

      const jobs = await jobsCollection.find(query).toArray()
      res.send(jobs)
    })

    // Get jobs with application count
    app.get('/jobs/applications', async (req, res) => {
      const email = req.query.email
      const query = { hr_email: email }

      const jobs = await jobsCollection.find(query).toArray()

      for (const job of jobs) {
        const applicationQuery = { jobId: job._id.toString() }
        const application_count =
          await applicationCollection.countDocuments(applicationQuery)

        job.application_count = application_count
      }

      res.send(jobs)
    })

    // Get single job
    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id

      const job = await jobsCollection.findOne({
        _id: new ObjectId(id)
      })

      res.send(job)
    })

    // Create job
    app.post('/jobs', async (req, res) => {
      const newJob = req.body
      const result = await jobsCollection.insertOne(newJob)
      res.send(result)
    })

          //  APPLICATION APIs
    

    // Get applications for a job
    app.get('/applications/jobs/:job_id', async (req, res) => {
      const job_id = req.params.job_id

      const applications = await applicationCollection
        .find({ jobId: job_id })
        .toArray()

      res.send(applications)
    })

    // Apply for a job
    app.post('/applications', async (req, res) => {
      const application = req.body
      const result = await applicationCollection.insertOne(application)
      res.send(result)
    })

    // Get my applications
    app.get('/applications', async (req, res) => {
      const email = req.query.email
      const query = { applicant: email }

      const applications = await applicationCollection.find(query).toArray()

      for (const application of applications) {
        const job = await jobsCollection.findOne({
          _id: new ObjectId(application.jobId)
        })

        if (job) {
          application.company = job.company
          application.title = job.title
          application.company_logo = job.company_logo
        }
      }

      res.send(applications)
    })

    // Update application status
    app.patch('/applications/:id', async (req, res) => {
      const id = req.params.id

      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: req.body.status
        }
      }

      const result = await applicationCollection.updateOne(
        filter,
        updatedDoc
      )

      res.send(result)
    })
  } catch (error) {
    console.error('Server Error:', error)
  }
}

  //  Start Server

run()

app.listen(port, () => {
  console.log(` Server running on port ${port}`)
})
