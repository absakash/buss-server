require("dotenv").config();
console.log(process.env.name);
const express = require("express");
const SSLCommerzPayment = require("sslcommerz-lts");

const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
app.use(cors());

app.use(express.json());

const port = process.env.PORT || 4000;

app.get("/", async (req, res) => {
  res.send("the router is going on ........");
});

// mongodb functions stated from here....

const store_id = process.env.StoreID;
const store_passwd = process.env.StorePassword;
const is_live = false; //true for live, false for sandbox

const uri =
  "mongodb+srv://volunteer:Volunteer@cluster0.5mwmpl3.mongodb.net/?retryWrites=true&w=majority";

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
    await client.connect();

    const BussDetails = client.db("BussProjects").collection("bussInfo");
    const userCollection = client.db("BussProjects").collection("users");
    const bookedCollection = client.db("BussProjects").collection("booked");
    app.get("/alldata", async (req, res) => {
      const query = {};
      const date = req.query.date;

      const option = await BussDetails.find(query).toArray();

      res.send(option);
    });
    //server
//     app.post('/updateSeats', async (req, res) => {
//       try {
//         const updatedData = req.body;
    
//         if (!Array.isArray(updatedData)) {
//           // Handle the case where updatedData is not an array
//           throw new Error('Invalid data format. Expected an array.');
//         }
    
//         // Assuming updatedData is an array of trains with seats information
//         for (const updatedTrain of updatedData) {
//           if (!updatedTrain.seats || !updatedTrain.seats.leftColum || !updatedTrain.seats.rightColum) {
//             // Handle the case where the expected properties are missing
//             throw new Error('Invalid train data format.');  
//           }
    
//           const { seats } = updatedTrain;
//           const updatedSeats = [];
    
//           for (const seat of seats.leftColum) {
//             updatedSeats.push({
//               id: seat.id,
//               disabled: seat.blocked, // Assuming blocked property indicates disabled status
//             });
//           }
    
//           for (const seat of seats.rightColum) {
//             updatedSeats.push({
//               id: seat.id,
//               disabled: seat.blocked,
//             });
//           }
    
//           // Assuming you have a 'seats' collection in your MongoDB
//           await bookedCollection.updateMany(
//             { 'seats.leftColum.id': { $in: updatedSeats.map(seat => seat.id) } },
//             { $set: { 'seats.leftColum.$.disabled': true } }
//           );
    
//           await bookedCollection.updateMany(
//             { 'seats.rightColum.id': { $in: updatedSeats.map(seat => seat.id) } },
//             { $set: { 'seats.rightColum.$.disabled': true } }
//           );
//         }
    
//         console.log("Seats Updated Successfully:", updatedData);
    
//         res.json({ success: true, message: "Seats updated successfully" });
//       } catch (error) {
//         console.error("Error updating seats:", error);
//         res.status(500).json({ success: false, message: "Internal Server Error" });
//       }
//     });

app.post('/alldata', async (req, res) => {
      const { date, arrive, departure, sitblocked } = req.body;
     
      try {
        // Use the dynamic date in the query
        const query = { [`schedule.${date}`]: { $elemMatch: { arrivalCity: arrive, departureCity: departure } } };
        
        // Update both leftColum and rightColum based on seat id
        const update = {
          $set: {
            [`schedule.${date}.$[elem].seats.leftColum.$[leftSeat].disabled`]: true,
            [`schedule.${date}.$[elem].seats.rightColum.$[rightSeat].disabled`]: true,
          },
          $inc: {
            [`schedule.${date}.$[elem].availableSeats`]: -1, // Decrease the total available seats
          },
        };
    
        const options = {
          arrayFilters: [
            { "elem.arrivalCity": arrive, "elem.departureCity": departure },
            { "leftSeat.id": sitblocked },
            { "rightSeat.id": sitblocked },
          ],
        };
    
        // Update the document in BussDetails collection
        const result = await BussDetails.updateOne(query, update, options);
    
        if (result.modifiedCount > 0) {
          res.status(200).json({ message: 'Seat updated successfully' });
        } else {
          res.status(404).json({ error: 'No matching record found' });
        }
      } catch (error) {
        console.error('Error updating seat:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    
    
    

    app.post("/users", async (req, res) => {
      const user = req.body;

      const result = await userCollection.insertOne(user);
      console.log(result);
      res.send(result);
    });

    app.get("/bookinfo/:tranId", async (req, res) => {
      try {
        const tranId = req.params.tranId;
        const query = {
          tranjectionId: tranId,
        };

        // Assuming you have a 'booked' collection in your MongoDB
        const bookedData = await bookedCollection.findOne(query);

        if (bookedData) {
          res.json(bookedData);
        } else {
          // Handle the case where no booking data is found for the given tranId
          res.status(404).json({ error: "Booking not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    const tran_id = new ObjectId().toString();
    app.post("/book", async (req, res) => {
      const book = req.body;

      const data = {
        total_amount: book.totalPrice,
        currency: "BDT",
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `http://localhost:4000/payment/success/${tran_id}`,
        fail_url: `http://localhost:4000/payment/fail/${tran_id}`,
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: "customer@example.com",
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      console.log(data);
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        const finalOrder = {
          paidStatus: false,
          tranjectionId: tran_id,
          bookInfo: book,
        };
        const result = bookedCollection.insertOne(finalOrder);
        console.log("Redirecting to: ", GatewayPageURL);
      });

      app.post("/payment/success/:tranId", async (req, res) => {
        console.log("train id", req.params.tranId);
        const result = await bookedCollection.updateOne(
          {
            tranjectionId: req.params.tranId,
          },
          {
            $set: {
              paidStatus: true,
            },
          }
        );

        if (result.modifiedCount > 0) {
          res.redirect(
            `http://localhost:5173/payment/success/${req.params.tranId}`
          );
        }
      });

      app.post("/payment/fail/:tranId", async (req, res) => {
        const result = await bookedCollection.deleteOne({
          tranjectionId: req.params.tranId,
        });

        if (result.deletedCount) {
          // If the order is successfully deleted, redirect to the fail URL
          res.redirect(
            `http://localhost:5173/payment/fail/${req.params.tranId}`
          );
        }
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //     await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`port is running at ${port}`);
});
