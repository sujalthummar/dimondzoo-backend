const mongoose = require("mongoose");
const { User } = require("../models/user");
const fileHelper = require("../utilities/multerFunction");
const responseManager = require("../utilities/responseManager");
const allowedContentTypes = require("../utilities/contentTypes");
const Image = require("../models/image");
const AwsCloud = require("../utilities/aws");
var fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const outputFilePath = "./images/output.webp";
const outputVideoPath = "output.mp4";
const { google } = require("googleapis");
const {
  saveToDrive,
  deleteFromDrive,
  videoSaveToDrive,
  deleteVideoFromDrive,
} = require("../utilities/googleDrive");
const ExcelJS = require("exceljs");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const aws = require("../utilities/aws copy");
// const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require("fluent-ffmpeg");
// ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfmpegPath(ffmpegPath);

const KEYFILEPATH = path.join(__dirname, "../utilities/apikeys.json");

const VIDEOKEYFILEPATH = path.join(__dirname, "../utilities/apikeys.json");

const SCOPES = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

// async function authorize() {
//   const jwtClient = new google.auth.JWT(
//     apikeys.client_email,
//     null,
//     apikeys.private_key,
//     SCOPE
//   );
//   await jwtClient.authorize();

//   return jwtClient;
// }

// async function uploadFileToDrive(auth, fileBuffer, userId) {
//   const drive = google.drive({ version: 'v3', auth });

//   const fileMetadata = {
//     name: `${userId}_profile_pic.jpg`,
//     parents: ["12Vm7lJytfqkUZ03dXP-Ux-xxIAQ5ENU8"], // Specify the folder ID in your Google Drive
//   };

//   const media = {
//     mimeType: 'image/jpeg',
//     body: fileBuffer,
//   };

//   await drive.files.create({
//     resource: fileMetadata,
//     media: media,
//   });
// }

// exports.profilePicUpload = async (req, res) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");

//   if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
//     const userData = await User.findById(req.token.userid)
//       .select("verified")
//       .lean();

//     if (userData && userData.verified == true) {
//       if (req.file) {
//         if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
//           const fileSize = parseFloat(parseFloat(req.file.size) / 1048576);
//           if (fileSize <= 2) {
//             AwsCloud.saveToS3(
//               req.file.buffer,
//               req.token.userid.toString(),
//               req.file.mimetype,
//               "profile"
//             )
//               .then((result) => {
//                 let obj = {
//                   s3_url: process.env.AWS_BUCKET_URI,
//                   url: result.data.Key,
//                 };
//                 User.findByIdAndUpdate(req.token.userid, {
//                   profile_pic: result.data.Key,
//                 }).then((profileData) => {
//                   return responseManager.onSuccess(
//                     "Profile pic uploaded successfully!",
//                     {
//                       first_name: profileData.first_name,
// last_name: profileData.last_name,
// email: profileData.email,
// verified: profileData.verified,
// role: profileData.role,
// purchases: profileData.purchases,
// mobile: `https://drive.google.com/uc?id=${req.token.userid}`,
// address: profileData.address,
// profile_pic: `https://drive.google.com/uc?id=${req.token.userid}`,
//                     },
//                     res
//                   );
//                 });
//               })
//               .catch((error) => {
//                 return responseManager.onError(error, res);
//               });
//           } else {
//             return responseManager.badrequest(
//               { message: "Image should be <= 2 MB" },
//               res
//             );
//           }
//         } else {
//           return responseManager.badrequest(
//             { message: "Invalid file type" },
//             res
//           );
//         }
//       } else {
//         return responseManager.badrequest(
//           { message: "Invalid file type" },
//           res
//         );
//       }
//     } else {
//       return responseManager.badrequest({ message: "User not verified" }, res);
//     }
//   } else {
//     return responseManager.badrequest(
//       { message: "Invalid token to upload image" },
//       res
//     );
//   }
// };
const processExcelFile = async (worksheet, req, thumbColumnIndex) => {
  const results = [];

  // Retrieve images from the worksheet
  const images = worksheet.getImages();

  await worksheet.eachRow(async (row, rowNumber) => {
    try {
      if (rowNumber > 1) {
        // Skip header row
        // Log the entire row for debugging
        console.log(`Row ${rowNumber}:`, row.values);

        // Assuming the image path is in the specified column
        const imagePathCell = row.getCell(thumbColumnIndex + 1);

        // Retrieve the image associated with the cell
        const image = images.find(
          (img) =>
            img.range.tl.row === imagePathCell.address.row &&
            img.range.tl.col === imagePathCell.address.col
        );

        // Log the image for debugging
        console.log(`Image in row ${rowNumber}:`, image);

        // Check if the image is found
        if (image) {
          // Convert the image to WebP format
          const webpBuffer = await sharp(image.image).webp().toBuffer();

          // Save the WebP image to Google Drive
          const result = await saveToDrive(
            webpBuffer,
            fileSize,
            req.file.mimetype,
            req.file.originalname,
            ["1m_HmzJOnlx59htsKYcb2tWOoTnCM1sFl"]
          );

          results.push({
            success: true,
            message: `Image in row ${rowNumber} uploaded successfully!`,
            url: result.data.id,
          });
        } else {
          // Log a message if the image is not found
          console.log(`Image in row ${rowNumber} not found. Skipping.`);
        }
      }
    } catch (error) {
      results.push({
        success: false,
        message: `Error processing row ${rowNumber}`,
        error: error.message,
      });
    }
  });

  return results;
};

exports.excelUpload = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      if (req.file) {
        if (
          allowedContentTypes.allowedContentTypes.some(
            (contentType) => contentType.mimeType === req.file.mimetype
          )
        ) {
          try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(req.file.buffer);
            const worksheet = workbook.getWorksheet(1);

            if (!worksheet) {
              throw new Error("Worksheet with index 1 not found.");
            }

            const thumbColumnIndex = worksheet
              .getRow(1)
              .values.indexOf("Thumb");

            if (thumbColumnIndex === -1) {
              throw new Error('Column with header "Thumb" not found.');
            }

            const results = await processExcelFile(
              worksheet,
              req,
              thumbColumnIndex
            );

            const successResults = results.filter((result) => result.success);
            const errorResults = results.filter((result) => !result.success);

            if (successResults.length > 0) {
              return responseManager.onSuccess(
                "Images uploaded successfully!",
                {
                  success: successResults.map((result) => ({
                    url: result.url,
                  })),
                },
                res
              );
            } else {
              return responseManager.onError(
                errorResults.map((result) => result.error),
                res
              );
            }
          } catch (error) {
            return responseManager.onError(error, res);
          }
        } else {
          return responseManager.badrequest(
            { message: "Invalid file type" },
            res
          );
        }
      } else {
        return responseManager.badrequest(
          { message: "Invalid file type" },
          res
        );
      }
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to upload image" },
      res
    );
  }
};

exports.profilePicUpload = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      if (req.file) {
        if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
          const fileSize = parseFloat(parseFloat(req.file.size) / 1048576);
          if (fileSize <= 2) {
            sharp(req.file.buffer)
              .webp()
              .toFile(outputFilePath, (err) => {
                if (err) {
                  console.error("Image conversion failed:", err);
                  return;
                }

                const webpBuffer = fs.readFileSync(outputFilePath);
                saveToDrive(
                  webpBuffer,
                  fileSize,
                  req.file.mimetype,
                  req.file.originalname,
                  ["1w2VNh3h56iGuih7P4RGKQxva0eG09Ax5"]
                )
                  .then((result) => {
                    User.findByIdAndUpdate(req.token.userid, {
                      profile_pic: result.data.id,
                    })
                      .then((profileData) => {
                        return responseManager.onSuccess(
                          "Profile pic uploaded successfully!",
                          {
                            first_name: profileData.first_name,
                            last_name: profileData.last_name,
                            email: profileData.email,
                            verified: profileData.verified,
                            role: profileData.role,
                            purchases: profileData.purchases,
                            mobile: result.data.id,
                            address: profileData.address,
                            profile_pic: result.data.id,
                          },
                          res
                        );
                      })
                      .catch((error) => {
                        return responseManager.onError(error, res);
                      });
                  })
                  .catch((error) => {
                    return responseManager.onError(error, res);
                  });
              });
          } else {
            return responseManager.badrequest(
              { message: "Image should be <= 2 MB" },
              res
            );
          }
        } else {
          return responseManager.badrequest(
            { message: "Invalid file type" },
            res
          );
        }
      } else {
        return responseManager.badrequest(
          { message: "Invalid file type" },
          res
        );
      }
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to upload image" },
      res
    );
  }
};

exports.thumbnailUpload = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      if (req.file) {
        aws
          .saveToS3WithName(
            req.file.buffer,
            "Categories",
            req.file.mimetype,
            "Images"
          )
          .then((result) => {
            let data = {
              url: result.data.Key,
            };
            return responseManager.onSuccess(
              "Header image for product uploaded successfully...!",
              data,
              res
            );
          })
          .catch((error) => {
            return responseManager.onError(error, res);
          });
      } else {
        return responseManager.badrequest(
          { message: "Image file must be <= 5 MB, please try again" },
          res
        );
      }
      // if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
      //   const fileSize = parseFloat(parseFloat(req.file.size) / 1048576);
      //   if (fileSize <= 2) {
      //     sharp(req.file.buffer)
      //       .webp()
      //       .toFile(outputFilePath, (err) => {
      //         if (err) {
      //           console.error("Image conversion failed:", err);
      //           return;
      //         }

      //         const webpBuffer = fs.readFileSync(outputFilePath);
      //         saveToDrive(
      //           webpBuffer,
      //           fileSize,
      //           "image/webp",
      //           req.file.originalname,
      //           ["19_oBI2dR4D9-u7wMHwjI4Fo-PNw9AsYq"]
      //         )
      //           .then((result) => {
      //             return responseManager.onSuccess(
      //               "Thumbnail uploaded successfully!",
      //               {
      //                 url: result.data.id,
      //               },
      //               res
      //             );
      //           })
      //           .catch((error) => {
      //             return responseManager.onError(error, res);
      //           });
      //       });
      //   } else {
      //     return responseManager.badrequest(
      //       { message: "Image should be <= 2 MB" },
      //       res
      //     );
      //   }
      // } else {
      //   return responseManager.badrequest(
      //     { message: "Invalid file type" },
      //     res
      //   );
      // }
      // } else {
      //   return responseManager.badrequest(
      //     { message: "Invalid file type" },
      //     res
      //   );
      // }
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to upload image" },
      res
    );
  }
};

exports.reviewUpload = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.file) {
    if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
      const fileSize = parseFloat(parseFloat(req.file.size) / 1048576);
      if (fileSize <= 2) {
        sharp(req.file.buffer)
          .webp()
          .toFile(outputFilePath, (err) => {
            if (err) {
              console.error("Image conversion failed:", err);
              return;
            }

            const webpBuffer = fs.readFileSync(outputFilePath);
            saveToDrive(
              webpBuffer,
              fileSize,
              req.file.mimetype,
              req.file.originalname,
              ["1XClPLqQM2M0HjZP8XZqK_PscdINHgEgN"]
            )
              .then((result) => {
                return responseManager.onSuccess(
                  "Review uploaded successfully!",
                  {
                    url: result.data.id,
                  },
                  res
                );
              })
              .catch((error) => {
                return responseManager.onError(error, res);
              });
          });
      } else {
        return responseManager.badrequest(
          { message: "Image should be <= 2 MB" },
          res
        );
      }
    } else {
      return responseManager.badrequest({ message: "Invalid file type" }, res);
    }
  } else {
    return responseManager.badrequest({ message: "Invalid file type" }, res);
  }
};

exports.bannerUpload = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      if (req.file) {
        if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
          const fileSize = parseFloat(parseFloat(req.file.size) / 1048576);
          if (fileSize <= 2) {
            sharp(req.file.buffer)
              .webp()
              .toFile(outputFilePath, (err) => {
                if (err) {
                  console.error("Image conversion failed:", err);
                  return;
                }

                const webpBuffer = fs.readFileSync(outputFilePath);
                saveToDrive(
                  webpBuffer,
                  fileSize,
                  req.file.mimetype,
                  req.file.originalname,
                  ["1i_8ovqbXgRrbVCfgDpbFhTQ1tx1HgXbq"]
                )
                  .then((result) => {
                    return responseManager.onSuccess(
                      "Banner uploaded successfully!",
                      {
                        url: result.data.id,
                      },
                      res
                    );
                  })
                  .catch((error) => {
                    return responseManager.onError(error, res);
                  });
              });
          } else {
            return responseManager.badrequest(
              { message: "Image should be <= 2 MB" },
              res
            );
          }
        } else {
          return responseManager.badrequest(
            { message: "Invalid file type" },
            res
          );
        }
      } else {
        return responseManager.badrequest(
          { message: "Invalid file type" },
          res
        );
      }
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to upload image" },
      res
    );
  }
};

exports.imageUpload = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      if (req.file) {
        if (req.file) {
          aws
            .saveToS3WithName(
              req.file.buffer,
              "Categories",
              req.file.mimetype,
              "Images"
            )
            .then((result) => {
              let data = {
                url: result.data.Key,
              };
              return responseManager.onSuccess(
                "Header image for product uploaded successfully...!",
                data,
                res
              );
            })
            .catch((error) => {
              return responseManager.onError(error, res);
            });
        } else {
          return responseManager.badrequest(
            { message: "Image file must be <= 5 MB, please try again" },
            res
          );
        }
      } else {
        return responseManager.badrequest(
          { message: "Invalid file type" },
          res
        );
      }
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to upload image" },
      res
    );
  }
};

exports.videoUpload = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      if (req.file) {
        if (allowedContentTypes.videoarray.includes(req.file.mimetype)) {
          const fileSize = parseFloat(parseFloat(req.file.size) / 1000000);

          // if (fileSize <= 25) {
          //   ffmpeg()
          //     .input(req.file)
          //     .videoCodec('libx265')
          //     .audioCodec('libmp3lame')
          //     on('end', () => {
          //       fs.unlink(req.file, (err) => {
          //         if (err) {
          //           console.log(err);
          //         }
          //       });
          //       return console.log("Done");
          //       videoSaveToDrive(
          //         req.file.buffer,
          //         fileSize,
          //         req.file.mimetype,
          //         req.file.originalname,
          //         ["1IYbBW6Q0aYQruCjS3aLpGeRx60EApU2n"]
          //       )
          //         .then((result) => {
          //           return responseManager.onSuccess(
          //             "Video uploaded successfully!",
          //             {
          //               url: result.data.id,
          //             },
          //             res
          //           );
          //         })
          //         .catch((error) => {
          //           return responseManager.onError(error, res);
          //         });
          //       // return responseManager.onSuccess(
          //       //   "Video compression successfully!",
          //       //   1,
          //       //   res
          //       // );
          //     })
          //     .on('error', (err) => {
          //       console.log(err);
          //       return responseManager.badrequest(
          //         { message: err.message },
          //         res
          //       );
          //     })
          // } else {
          //   return responseManager.badrequest(
          //     { message: "Video should be <= 25 MB" },
          //     res
          //   );
          // }
          aws
            .saveToS3WithName(
              req.file.buffer,
              "Categories",
              req.file.mimetype,
              "Images"
            )
            .then((result) => {
              let data = {
                url: result.data.Key,
              };
              return responseManager.onSuccess(
                "Header image for product uploaded successfully...!",
                data,
                res
              );
            })
            .catch((error) => {
              return responseManager.onError(error, res);
            });
        } else {
          return responseManager.badrequest(
            { message: "Video file type" },
            res
          );
        }
      } else {
        return responseManager.badrequest({ message: "Video file type" }, res);
      }
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to upload video" },
      res
    );
  }
};

// exports.videoUpload = async (req, res) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");

//   if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
//     const userData = await User.findById(req.token.userid)
//       .select("verified")
//       .lean();

//     if (userData && userData.verified == true) {
//       if (req.file) {
//         if (allowedContentTypes.videoarray.includes(req.file.mimetype)) {
//           const fileSize = parseFloat(parseFloat(req.file.size) / 1000000);
//           console.log("before : ", fileSize);
//           if (fileSize <= 25) {
//             // Video compression settings
//             // const compressionSettings = {
//             //   videoBitrate: "500k",
//             //   audioBitrate: "128k",
//             // };

//             console.log('Output Video Path:', req.file);

//             ffmpeg()
//             .input(inputVideoPath)
//             // .inputFormat('mp4')  // Specify the input format if needed
//             // .format('mp4')
//             .outputOptions('-vf','scale=-2:720')
//             // .output(req.file.originalname+'dix.mp4')
//             // .videoCodec('libx264')
//             // .noAudio()
//             // .size('640x360')
//             .saveToFile('output.mp4')
//             .on('progress', (progress) => {
//               if (progress.percent) {
//                 console.log(`Processing: ${Math.floor(progress.percent)}% done`);
//               }
//             })
//             .on('end', () => {
//               console.log('Compression finished');

//               // Now, you can proceed with saving to Google Drive or other actions
//               saveToDrive(
//                 req.file.buffer,
//                 fileSize,
//                 req.file.mimetype,
//                 req.file.originalname,
//                 ['10CwzUt8kSaeb80IeyIFAO8V7_BebMF54']
//               )
//                 .then((result) => {
//                   return responseManager.onSuccess(
//                     'Video uploaded and compressed successfully!',
//                     {
//                       url: result.data.id,
//                     },
//                     res
//                   );
//                 })
//                 .catch((error) => {
//                   return responseManager.onError(error, res);
//                 });
//             })
//             .on('error', (err) => {
//               console.error('Error during compression:', err);
//               return responseManager.onError(err, res);
//             })
//             .save(outputVideoPath);

//           } else {
//             return responseManager.badrequest(
//               { message: "Video should be <= 25 MB" },
//               res
//             );
//           }
//         } else {
//           return responseManager.badrequest(
//             { message: "Video file type" },
//             res
//           );
//         }
//       } else {
//         return responseManager.badrequest({ message: "Video file type" }, res);
//       }
//     } else {
//       return responseManager.badrequest({ message: "User not verified" }, res);
//     }
//   } else {
//     return responseManager.badrequest(
//       { message: "Invalid token to upload video" },
//       res
//     );
//   }
// };

exports.categoryPic = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (req.file) {
      // if(allowedContentTypes.imagearray.includes(req.file.mimetype)){
      //   let sizeOfImageInMB = helper.bytesToMB(req.file.size);
      //   if(sizeOfImageInMB <= 5){
      aws
        .saveToS3WithName(
          req.file.buffer,
          "Categories",
          req.file.mimetype,
          "Images"
        )
        .then((result) => {
          let data = {
            url: result.data.Key,
          };
          return responseManager.onSuccess(
            "Header image for product uploaded successfully...!",
            data,
            res
          );
        })
        .catch((error) => {
          return responseManager.onError(error, res);
        });
    } else {
      return responseManager.badrequest(
        { message: "Image file must be <= 5 MB, please try again" },
        res
      );
    }
    //   }else{
    //     return responseManager.badrequest({ message: 'Invalid file type only image files allowed for profile pic, please try again...!' }, res);
    //   }
    // }else{
    //   return responseManager.badrequest({ message: 'Invalid file, please try again' }, res);
    // }
    // if (userData && userData.verified == true) {
    //   if (req.file) {
    //     if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
    //       const fileSize = parseFloat(parseFloat(req.file.size) / 1048576);
    //       if (fileSize <= 2) {
    //         sharp(req.file.buffer)
    //           .webp()
    //           .toFile(outputFilePath, (err) => {
    //             if (err) {
    //               console.error("Image conversion failed:", err);
    //               return;
    //             }

    //             const webpBuffer = fs.readFileSync(outputFilePath);
    //             saveToDrive(
    //               webpBuffer,
    //               fileSize,
    //               req.file.mimetype,
    //               req.file.originalname,
    //               ["1Emqudnz6jhvvLJhJ8k_xKZeGvcBR-zqI"]
    //             )
    //               .then((result) => {
    //                 return responseManager.onSuccess(
    //                   "Category photo uploaded successfully!",
    //                   {
    //                     url: result.data.id,
    //                   },
    //                   res
    //                 );
    //               })
    //               .catch((error) => {
    //                 return responseManager.onError(error, res);
    //               });
    //           });
    //       } else {
    //         return responseManager.badrequest(
    //           { message: "Image should be <= 2 MB" },
    //           res
    //         );
    //       }
    //     } else {
    //       return responseManager.badrequest(
    //         { message: "Invalid file type" },
    //         res
    //       );
    //     }
    //   } else {
    //     return responseManager.badrequest(
    //       { message: "Invalid file type" },
    //       res
    //     );
    //   }
    // } else {
    //   return responseManager.badrequest({ message: "User not verified" }, res);
    // }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to upload image" },
      res
    );
  }
};

exports.designPic = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.file) {
    if (allowedContentTypes.imagearray.includes(req.file.mimetype)) {
      const fileSize = parseFloat(parseFloat(req.file.size) / 1048576);
      if (fileSize <= 2) {
        sharp(req.file.buffer)
          .webp()
          .toFile(outputFilePath, (err) => {
            if (err) {
              console.error("Image conversion failed:", err);
              return;
            }

            const webpBuffer = fs.readFileSync(outputFilePath);
            saveToDrive(
              req.file.buffer,
              fileSize,
              req.file.mimetype,
              req.file.originalname,
              ["13yheqUjC-DdA8yygI2pihRAzsMCC6E84"]
            )
              .then((result) => {
                return responseManager.onSuccess(
                  "Design photo uploaded successfully!",
                  {
                    url: result.data.id,
                  },
                  res
                );
              })
              .catch((error) => {
                return responseManager.onError(error, res);
              });
          });
      } else {
        return responseManager.badrequest(
          { message: "Image should be <= 2 MB" },
          res
        );
      }
    } else {
      return responseManager.badrequest({ message: "Invalid file type" }, res);
    }
  } else {
    return responseManager.badrequest({ message: "Invalid file type" }, res);
  }
};

exports.removeMedia = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      const { url } = req.body;

      deleteVideoFromDrive(url)
        .then((result) => {
          return responseManager.onSuccess(
            "File removed successfully!",
            1,
            res
          );
        })
        .catch((error) => {
          return responseManager.onError(error, res);
        });
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to upload image" },
      res
    );
  }
};
