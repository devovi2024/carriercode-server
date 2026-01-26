const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

// middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Carrier Code Cooking')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.h6qghpe.mongodb.net/?appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    await client.connect()
    await client.db("admin").command({ ping: 1 })
    console.log("Pinged your deployment. You successfully connected to MongoDB!")
  } finally {
    // await client.close()
  }
}
run().catch(console.dir)

app.listen(port, () => {
  console.log(`Server is running... ${port}`)
})
