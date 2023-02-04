const { default: mongoose } = require("mongoose");
const reviewModel = require("../Models/reviewModel");

const validator = require("validator");
const bookModel = require("../Models/bookModel");

const createReview = async function (req, res) {
  try {
    let data = req.body;

    if (Object.keys(data).length === 0)
      return res
        .status(400)
        .send({ status: false, message: "plz send data for create review" });
    if (!data)
      return res
        .status(400)
        .send({ status: false, messaage: "plz send review Data" });

    let { reviewedBy, rating, review } = data;

    let bookId = req.params.bookId;
    data.bookId = bookId;
    // if(data.bookId!=bookId) return res.status(400).send({status:false,mesage:"params bookId and body's book id is not same"})
    data.isDeleted = false;

    if (data.reviewedAt) {
      if (!validator.isDate(data.reviewedAt))
        return res
          .status(400)
          .send({
            status: false,
            message:
              "Invalid date or formate,plz send date in this formate (YYYY/MM/DD) ",
          });
    } else {
      data.reviewedAt = Date.now();
    }

    if (!bookId)
      return res
        .status(400)
        .send({ status: false, massage: "bookId is required" });
    if (!mongoose.isValidObjectId(bookId))
      return res
        .status(400)
        .send({ status: false, massage: "bookId is not a valid ObjectId" });

    if (!reviewedBy) {
      data.reviewedBy = "Guest";
    } else if (reviewedBy) {
      if (!validator.isAlpha(reviewedBy.split(" ").join("")))
        return res
          .status(400)
          .send({ status: false, message: "plz enter valid name" });
    }

    if (!rating)
      return res
        .status(400)
        .send({ status: false, message: "rating is required" });

    if (!(rating >= 1 && rating <= 5))
      return res
        .status(400)
        .send({ status: false, message: "rating should be in between 0 to 5" });

    if (typeof rating != "number")
      return res
        .status(400)
        .send({
          status: false,
          message: "invalid rating / rating must be innumber",
        });

    if (review) {
      if (validator.isAlphanumeric(review))
        return res
          .status(400)
          .send({ status: false, message: "review is invalid" });
    }

    let book = await bookModel
      .findOneAndUpdate(
        { _id: bookId, isDeleted: false },
        { $inc: { reviews: 1 } },
        { new: true }
      )
      .lean()
      .select({ __v: 0,_id:0 });
    if (!book)
      return res.status(404).send({ status: false, message: "book not found" });
    let reviewData = {
      reviewedBy,
      rating,
      review,
      reviewedAt: Date.now(),
      bookId,
    };
    const savedData = await reviewModel.create(reviewData);

    let { __v, ...otherData } = savedData._doc;

    book.reviewsData = otherData;

    res.status(201).send({ status: true, message: "Books List", data: book });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

const reviewUpdate = async function (req, res) {
  try {
    let data = req.body;
    const { rating, review, reviewedBy } = data;

    if (Object.keys(data).length == 0) {
      return res
        .status(400)
        .send({ status: false, message: "please provide some data" });
    }

    let bookId = req.params.bookId;
    if (!bookId)
      return res
        .status(400)
        .send({ status: false, message: " please enter bookId" });

    if (!mongoose.isValidObjectId(bookId)) {
      return res
        .status(400)
        .send({ status: false, message: "enter valid book id" });
    }
    if (rating < 1 || rating > 5)
      return res
        .status(400)
        .send({ status: false, message: "rating should be inbetween 1 and 5" });
    if (rating) {
      if (typeof rating != "number") {
        return res.status(400).send({status:false, message: "Invalid value of rating" });
      }
    }
    if (review) {
      if (typeof review != "string") {
        return res.status(400).send({status:false, message: "Invalid value of review" });
      }
    }
    if (reviewedBy) {
      if (typeof reviewedBy != "string") {
        return res.status(400).send({status:false, message: "Invalid value of reviewedBy" });
      }
    }
    let book = await bookModel.findOne({ _id: bookId, isDeleted: false });

    if (!book) {
      return res
        .status(404)
        .send({ status: false, message: "Book  not found" });
    }

    let reviewId = req.params.reviewId;

    if (!reviewId)
      return res
        .status(400)
        .send({ status: false, message: "please enter rewiewId" });

    if (!mongoose.isValidObjectId(reviewId)) {
      return res
        .status(400)
        .send({ status: false, message: "enter valid review id" });
    }

    let reviewExist = await reviewModel.findOne({
      _id: reviewId,
      isDeleted: false,
    });
    if (!reviewExist) {
      return res
        .status(404)
        .send({ status: false, message: "review  not exists" });
    }

    let savedData = await reviewModel.findOneAndUpdate(
      { _id: reviewId },
      data,
      { updatedAt: new Date(), new: true }
    );
    return res.status(200).send({ status: true, message:"Success",data:savedData });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, message: error.message });
  }
};

const reviewDelete = async function (req, res) {
  try {
    let bookId = req.params.bookId;
    let reviewId = req.params.reviewId;

    if (!mongoose.isValidObjectId(bookId)) {
      return res
        .status(400)
        .send({ status: false, message: "enter valid book id" });
    }

    if (!mongoose.isValidObjectId(reviewId)) {
      return res
        .status(400)
        .send({ status: false, message: "enter valid review id" });
    }

    let deleteReview = await reviewModel.findOneAndUpdate(
      { _id: reviewId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    if (!deleteReview)
      return res
        .status(404)
        .send({ status: false, message: "not found or review is deleted" });

    let book = await bookModel.findOneAndUpdate(
      { _id: bookId, isDeleted: false },
      { $inc: { reviews: -1 } },
      { new: true }
    );
    if (!book) {
      return res
        .status(404)
        .send({ status: false, message: "Book  not found" });
    }

    return res
      .status(200)
      .send({ status: true, message: "Deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = { createReview, reviewUpdate, reviewDelete };
