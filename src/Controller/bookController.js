const bookModel = require("../Models/bookModel");

const mongoose = require("mongoose");
const validator = require("validator");
const userModel = require("../Models/userModel");
const reviewModel = require("../Models/reviewModel");
const { findOneAndUpdate } = require("../Models/userModel");
const aws = require("aws-sdk");
const { uploadFile } = require("./aws");

let isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;
let validateTitle = /^[^0-9][a-z , A-Z0-9_ ? @ ! $ % & * : ]+$/;

const createBook = async (req, res) => {
  try {
    let data = req.body;
    // let files = req.files;

    // let uploadedFileURL;
    // if (files && files.length > 0) {
    //   uploadedFileURL = await uploadFile(files[0]);
    // } else {
    //   return res.status(400).send({ msg: "No file found" });
    // }

    if (Object.keys(data).length === 0)
      return res
        .status(400)
        .send({ status: false, message: "plz provide valid details" });

    let {
      title,
      excerpt,
      userId,
      ISBN,
      category,
      subcategory,
      reviews,
      releasedAt,
    } = data;

    let findBookbyTitle = await bookModel.findOne({ title: title });
    if (findBookbyTitle)
      return res
        .status(409)
        .send({ status: false, message: "title is already in exist" });

    if (!title) {
      return res
        .status(400)
        .send({ status: false, message: "title is required" });
    }
    if (!validateTitle.test(title.split(" ").join("")))
      return res
        .status(400)
        .send({ status: false, message: "plz enter valid title" });

    if (!excerpt)
      return res
        .status(400)
        .send({ status: false, message: "excerpt is mandatory" });
    if (!validateTitle.test(excerpt.split(" ").join("")))
      return res
        .status(400)
        .send({ status: false, message: "plz enter valid excerpt" });
    if (!userId)
      return res
        .status(400)
        .send({ status: false, message: "userId is mandatory" });

    userId = data.userId.trim();
    data.userId = userId;

    if (!mongoose.isValidObjectId(userId))
      return res
        .status(400)
        .send({ status: false, message: "plz provide valid userId" });
    if (userId != req.tokenDetails.userId)
      return res
        .status(400)
        .send({ status: false, message: "This userId is not exist in token" });
    let findBookbyISBN = await bookModel.findOne({ ISBN: ISBN });
    if (findBookbyISBN)
      return res
        .status(409)
        .send({ status: false, message: "ISBN is already in exist" });
    if (!ISBN)
      return res
        .status(400)
        .send({ status: false, message: "ISBN is mandatory" });
    if (!isbnRegex.test(ISBN))
      return res.status(400).send({ status: false, message: "Invalid ISBN" });
    if (!category)
      return res
        .status(400)
        .send({ status: false, message: "category is mandatory" });
    if (!validateTitle.test(category.split(" ").join("")))
      return res
        .status(400)
        .send({ status: false, message: "plz enter valid name" });
    if (!subcategory)
      return res
        .status(400)
        .send({ status: false, message: "subcategory is mandatory" });
    if (!validateTitle.test(subcategory.split(" ").join("")))
      return res
        .status(400)
        .send({ status: false, message: "plz enter valid name" });

    if(!releasedAt) return res
    .status(400)
    .send({
      status: false,
      message:
        " releasedAt is mandatory,plz send date in this formate (YYYY/MM/DD) ",
    });

    if (!validator.isDate(releasedAt))
      return res
        .status(400)
        .send({
          status: false,
          message:
            "Invalid date or formate,plz send date in this formate (YYYY/MM/DD) ",
        });

    if (reviews) {
      if (typeof reviews != "number")
        return res
          .status(400)
          .send({ status: false, message: "plz provide valid review" });
    }

    let findUser = await userModel.findById({ _id: userId });
    if (!findUser)
      return res
        .status(404)
        .send({ status: true, message: "User not found, check userId" });

    let bookData = {
      title,
      excerpt,
      userId,
      ISBN,
      category,
      subcategory,
      reviews: 0,
      releasedAt: Date.now()
    //   bookCover: uploadedFileURL,
    }; //bookCover:uploadedFileURL
    let createBook = await bookModel.create(bookData);

    let { __v, ...otherData } = createBook._doc;

    res.status(201).send({ status: true, data: otherData });
  } catch (error) {
    console.log("error in create book", error.message);
    res.send(error.message);
  }
};

const getBooks = async (req, res) => {
  try {
    let data = req.query;

    let keys = Object.keys(data);
    keys.forEach((x) => {
      return x.toLowerCase();
    });

    data.isDeleted = false;

    if (keys.length === 0) {
      let getAllBooks = await bookModel
        .find({ isDeleted: false })
        .sort({ title: 1 })
        .select({
          ISBN: 0,
          subcategory: 0,
          isDeleted: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
        });
      if (getAllBooks.length === 0)
        return res
          .status(404)
          .send({ status: false, message: "books not found" });
      let lengthOfAllbooks = getAllBooks.length;
      return res
        .status(200)
        .send({
          status: true,
          TotalBooks: lengthOfAllbooks,
          data: getAllBooks,
        });
    }

    if (keys.includes("userId")) {
      if (!mongoose.isValidObjectId(data.userId))
        return res
          .status(400)
          .send({ status: false, message: "userID is invalid" });
    }
    if (keys.includes("category")) {
      if (!validator.isAlpha(data.category))
        return res
          .status(400)
          .send({ status: false, message: "plz provide valid category value" });
    }
    if (keys.includes("subcategory")) {
      if (!validator.isAlpha(data.subcategory))
        return res
          .status(400)
          .send({
            status: false,
            message: "plz provide valid subcategory value",
          });
    }

    let getBooks = await bookModel
      .find(data)
      .select({ ISBN: 0, isDeleted: 0, createdAt: 0, updatedAt: 0, __v: 0 })
      .sort({ title: 1 });
    if (getBooks.length === 0)
      return res
        .status(404)
        .send({ status: false, message: "books not found" });

    res.status(200).send({ status: true, data: getBooks });
  } catch (error) {
    console.log("error in getBooks", error.message);
    res.status(500).send({ message: error.message });
  }
};

const getBookById = async function (req, res) {
  try {
    let bookId = req.params.bookId;

    if (!bookId)
      return res.status(400).send({ message: "please enter bookId" });
    if (!mongoose.isValidObjectId(bookId))
      return res
        .status(400)
        .send({ status: false, message: "bookId is not valid" });

    let bookData = await bookModel
      .findOne({ _id: bookId, isDeleted: false })
      .select({ __v: 0, isDeleted: 0 })
      .lean();
    if (!bookData) return res.status(404).send({ message: "no book found" });

    let booksReviews = await reviewModel
      .find({ bookId: bookId, isDeleted: false })
      .select({ createdAt: 0, updatedAt: 0, isDeleted: 0, __v: 0 });
    bookData.booksReviews = booksReviews;

    res
      .status(200)
      .send({ status: true, message: "Book List", data: bookData });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};

const updateBookById = async (req, res) => {
  try {
    let data = req.body;
    if (Object.keys(data).length === 0)
      return res
        .status(400)
        .send({
          status: false,
          message: "plz provide valid details for update",
        });

    let keys = Object.keys(data);
    let bookId = req.params.bookId;

    if (
      keys.includes("reviews") ||
      keys.includes("userId") ||
      keys.includes("isDeleted") ||
      keys.includes("category") ||
      keys.includes("subcategory")
    ) {
      return res
        .status(400)
        .send({ status: false, message: "This fields cannot be updated" });
    }

    let { title, excerpt, releasedAt, ISBN } = data;

    if (title) {
      if (!validateTitle.test(title.split(" ").join("")))
        return res
          .status(400)
          .send({ status: false, message: "plz provide valide title " });
    }
    if (excerpt) {
      if (!validateTitle.test(excerpt))
        return res
          .status(400)
          .send({ status: false, message: "plz provide valide excerpt" });
    }
    if (releasedAt) {
      if (!validator.isDate(releasedAt))
        return res
          .status(400)
          .send({
            status: false,
            message:
              "Invalid date or formate,plz send date in this formate (YYYY/MM/DD) ",
          });
    }
    if (ISBN) {
      if (!isbnRegex.test(ISBN))
        return res
          .status(400)
          .send({ status: false, message: "plz provide valide regex ISBN" });
    }

    let findDuplicateValue = await bookModel.findOne({
      $or: [{ title: title }, { ISBN: ISBN }],
    });
    if (findDuplicateValue)
      return res
        .status(409)
        .send({
          status: false,
          message: "given value of ISBN/Title is already exist",
        });
    let dataForUpdate = {
      title,
      excerpt,
      releasedAt,
      ISBN,
      updatedAt: Date.now(),
    };
    let updateData = await bookModel.findOneAndUpdate(
      { _id: bookId, isDeleted: false },
      dataForUpdate,
      { new: true }
    );
    if (!updateData) {
      return res.status(404).send({ status: false, message: "No books found" });
    }

    return res.status(200).send({ status: true, data: updateData });
  } catch (error) {
    console.log("error in updateBook", error.message);
    res.status(500).send({ error: error.message });
  }
};

const deleteBookById = async function (req, res) {
  try {
    let bookId = req.params.bookId;

    if (!bookId)
      return res
        .status(400)
        .send({ status: false, message: "BookId is required." });
    if (!mongoose.isValidObjectId(bookId))
      return res
        .status(400)
        .send({ status: false, message: "Invalid BookId." });

    let deletedBook = await bookModel.findOneAndUpdate(
      { _id: bookId, isDeleted: false },
      { isDeleted: true, deletedAt: Date.now() },
      { new: true }
    );
    if (!deletedBook)
      return res
        .status(404)
        .send({
          status: false,
          message: "Book not found or book is already deleted",
        });

    res.status(200).send({ status: true, message: " book is deleted " });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBookById,
  deleteBookById,
};
