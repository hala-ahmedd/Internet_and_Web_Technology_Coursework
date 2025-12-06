const { trips } = require('../models/Trip');

// Retrieve all trips
const retrieveAllTrips = (req, res) => {
  const allTrips = trips;
  res.status(200).json({
    status: 'success',
    message: 'Trips retrieved successfully',
    results: allTrips.length,
    data: allTrips,
  });
};

// Create a new trip
const createTrip = (req, res) => {
  const {
    destinationName,
    location,
    continent,
    language,
    description,
    flightCost,
    accommodationCost,
    mealCost,
    visaCost,
    transportationCost,
    currencyCode,
  } = req.body;

  if (
    !destinationName ||
    !location ||
    !continent ||
    !language ||
    !description
  ) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide all required fields.',
    });
  }

  const newTrip = {
    id: trips.length + 1,
    destinationName,
    location,
    continent,
    language,
    description,
    flightCost: flightCost || 0,
    accommodationCost: accommodationCost || 0,
    mealCost: mealCost || 0,
    visaCost: visaCost || 0,
    transportationCost: transportationCost || 0,
    currencyCode: currencyCode || 'N/A',
  };

  trips.push(newTrip);

  res.status(201).json({
    status: 'success',
    message: 'Trip created successfully',
    data: newTrip,
  });
};


module.exports = {
  createTrip,
  retrieveAllTrips
};
