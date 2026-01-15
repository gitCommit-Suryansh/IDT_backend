const client = require('../redis/client');

const saveOtp = async (mobile, otp) => {
  // store OTP as string to avoid type-mismatch on retrieval
  await client.set(`otp:${mobile}`, String(otp), { EX: 300 }); // expires in 5 min
};

const saveTempUser = async (mobileNumber, name, email, age, gender, password) => {
  await client.set(`tempUser:${mobileNumber}`, JSON.stringify({
    name, email, mobileNumber, age, gender, password,
  }), { EX: 300 });
};

const getTempUser = async (mobileNumber) => {
  return await client.get(`tempUser:${mobileNumber}`);
};


const deleteTempUser=async(mobileNumber)=>{
  return await client.del(`tempUser:${mobileNumber}`);
}

const verifyOtp = async (mobile, inputOtp) => {
  const savedOtp = await client.get(`otp:${mobile}`);
  if (!savedOtp) return false;
  // compare as strings to avoid type mismatch between stored value and incoming value
  return String(savedOtp) === String(inputOtp);
};

module.exports = { saveOtp, verifyOtp,saveTempUser ,getTempUser,deleteTempUser};
