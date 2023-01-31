let uploadFile = async (file) => {
    try {
        return new Promise(function (resolve, reject) {
            let s3 = new aws.S3({ apiVersion: "2006-03-01" })
            var uploadParams = {
                ACL: "public-read",
                Bucket: "classroom-training-bucket",
                Key: "ecart/" + file.originalname,
                Body: file.buffer
            }
            s3.upload(uploadParams, function (err, data) {
                if (err) {
                    console.log("can't upload file")
                    return reject({ "error": err })
                }
                console.log(" file uploaded succesfully ")
                return resolve(data.Location)
            })
        })
    }
    catch (error) {
        console.log(error)
        res.status(500).send({ status: false, message: error.message })
    }
}