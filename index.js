const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT||5000
const cors = require('cors')
app.use(express.json());
app.use(cors());
require('dotenv').config();
const jwt = require('jsonwebtoken');

const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f7zs7lw.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
  
    if (!authorization) {
      return res.status(401).send({ error: true, message: "Unauthorized access" });
    }
  
    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
      if (error) {
        return res.status(403).send({ error: true, message: "Unauthorized access" });
      }
      req.decoded = decoded;
      next();
    });
  };
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const carRenterUsers = client.db("carRenterUsersDB").collection("carRenterUsersCollections");


    const carRenterCars = client.db("carRenterCarsDB").collection("carRenterCarsCollections");


    const carBookings= client.db("carBookingsDB").collection("carBookingsCollections");

    const carBookingsPaymentCollections= client.db("carBookingsPaymentDB").collection("carBookingsPaymentCollections");



    const carFavouriteCollections= client.db("carFavouriteDB").collection(" carFavouriteCollections");


 



    





    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      res.send({ token });
    });


const verifyCarOwner= async(req,res,next)=>{
  const email= req.decoded.email;
  const query={email :email}
  const user= await carRenterUsers.findOne(query)
  if(user?.role !=='Carowner'){
    return res.status(403).send({error: true, message:"forbidden message"})

  }
  next()

}

const verifyCarrenter= async(req,res,next)=>{
  const email= req.decoded.email;
  const query={email :email}
  const user= await carRenterUsers.findOne(query)
  if(user?.role !=='Carrenter'){
    return res.status(403).send({error: true, message:"forbidden message"})

  }
  next()

}

app.post("/favourites", async (req, res) => {
  const favourite = req.body;
 
const result= await carFavouriteCollections.insertOne(favourite)
res.send(result)
});


app.get("/favourites",async (req, res) => {
 
  let query={}
  if(req.query.email){
    query={email: req.query.email}
  }

const result= await carFavouriteCollections.find().toArray()
res.send(result)
});


app.delete("/favourites/:id",async (req, res) => {
 let query={id: req.params.id}
const result= await carFavouriteCollections.deleteOne(query)
res.send(result)
});















    app.post("/payments", async (req, res) => {
   const payment=req.body
   const result= await carBookingsPaymentCollections.insertOne(payment)
   let query={_id: new ObjectId(payment.id)}
   const deletedResult= await carBookings.deleteOne(query)

   res.send({result,deletedResult})
    });
    
    app.get("/payments",verifyJWT,verifyCarrenter, async (req, res) => {
        
      if (req.decoded.email !== req.query.email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
let query={}
if(req.query.email){
  query={email: req.query.email}
}

const result= await carBookingsPaymentCollections.find(query).toArray()
res.send(result)
       });
       

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
    const ammount=price*100
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: ammount,
        currency: "usd",
        payment_method_types:['card']
       
      });
    
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    














    app.post('/carbookings',async (req, res) => {
      const bookings=req.body
   
      const booking=await carBookings.insertOne(bookings)
      res.send(booking)
    })

    app.get('/carbookings',verifyJWT,verifyCarrenter,async (req, res) => {
      if (req.decoded.email !== req.query.email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      let query={}
      if(req.query?.email){
        query={myemail:req.query?.email}
      }
      const bookings=await carBookings.find(query).toArray()
      res.send(bookings)
    })

    app.delete('/carbookings/:id',async (req, res) => {
 
      const cars=await carBookings.deleteOne({_id: new ObjectId(req.params.id)})


      res.send(cars)
    })

    app.get('/carbookings/:id',async (req, res) => {
 
      const cars=await carBookings.findOne({_id: new ObjectId(req.params.id)})


      res.send(cars)
    })
    
    app.post('/allusers',async (req, res) => {
        const users=req.body
        const existingUser=await carRenterUsers.findOne({email:users.email})
        if(existingUser){
            return res.send({message:"user already exist"})
        }
        const user=await carRenterUsers.insertOne(users)
        res.send(user)
      })

    app.get('/allusers',async (req, res) => {
        const users=await carRenterUsers.find().toArray()
        res.send(users)
      })

   app.get('/user/carowner/:email', verifyJWT,async (req, res) => {
    const email = req.params.email;
    if (req.decoded.email !== email) {
      return res.send({carowner: false });
    }
    const query = { email: email };
    const user = await carRenterUsers.findOne(query);
    const result = { carowner: user?.role === "Carowner" };
    res.send(result);
  })


  app.get('/user/carrenter/:email', verifyJWT,async (req, res) => {
    const email = req.params.email;
    if (req.decoded.email !== email) {
      return res.send({carrenter: false });
    }
    const query = { email: email };
    const user = await carRenterUsers.findOne(query);
    const result = { carrenter: user?.role === "Carrenter" };
    res.send(result);
  })








     
      
      app.post('/allcars',async (req, res) => {
        const cars=req.body
        const car=await carRenterCars.insertOne(cars)
        res.send(car)
      })

    app.get('/allcars',async (req, res) => {
      let query = {};
      const options={
        sort:{"price":req.query.sort==='asc'?1:-1}
      }

      if (req.query?.search) {
        query.carname = { $regex: req.query.search, $options: "i" };
      }
    
      if (req.query?.location) {
        query.location = { $regex: req.query.location, $options: "i" };
      }
    
      if (req.query?.brand&&req.query.brand.toLowerCase() !== 'all'&&req.query?.brand!=='Select Brand') {
        query.brand = req.query.brand;
      }
    
      if (req.query?.cartype) {
        query.cartype = req.query.cartype;
      }
    
      if (req.query?.fueltype&&req.query.fueltype.toLowerCase() !== 'all'&&req.query?.fueltype!=='Select Fuel Type') {
        query.fueltype = req.query.fueltype;
      }
    
      if (req.query?.availability) {
        query.availability = req.query.availability;
      }
    
  
      if (req.query?.price) {
   
        query.price = parseInt(req.query?.price)
      }
      const page= parseInt(req.query.page)||0
      const limit= parseInt(req.query.limit)||8
      const skip=page*limit
        const cars=await carRenterCars.find(query,options).skip(skip).limit(limit).toArray()
  

        res.send(cars)
      })


 

    app.get('/carrentercars',verifyJWT,verifyCarOwner,async (req, res) => {
    
      if (req.decoded.email !== req.query.email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      let query={}
      if(req.query?.email){
        query={email: req.query?.email}
      }
        const cars=await carRenterCars.find(query).toArray()
  

        res.send(cars)
      })

      app.put('/carrentercars/:id',async (req, res) => {
        const id =req.params.id
        const carinfo=req.body
        const filter={_id: new ObjectId(id)}
        const options = { upsert: true };
      
        const updateDoc = {
          $set: {
           
            username:carinfo.username,
            carname:carinfo.carname,
            email:carinfo.email,
            location:carinfo.location,
            fueltype:carinfo.fueltype,
            price:carinfo.price,
            availabilitydate:carinfo.availabilitydate,
            photo:carinfo.photo
          },
        };
        const result=await carRenterCars.updateOne(filter, updateDoc, options);
        res.send(result)
    
        })
  
  

      app.get('/carrentercars/:id',async (req, res) => {
       
          const result=await carRenterCars.findOne({_id: new ObjectId(req.params.id)})
    
  
          res.send(result)
        })







      app.delete('/carrentercars/:id',async (req, res) => {
 
          const cars=await carRenterCars.deleteOne({_id: new ObjectId(req.params.id)})
    
  
          res.send(cars)
        })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Car renter server')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})