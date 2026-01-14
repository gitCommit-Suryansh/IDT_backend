const axios = require('axios');

const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY || null;

const sendOtp = async (mobile, otp) => {
  const url = 'https://www.fast2sms.com/dev/bulkV2';

  const params = {
    message: `Your OTP is ${otp}`,
    route: 'q',
    numbers: mobile,
  };

  const headers = {
    'cache-control': 'no-cache',
  };

  if (FAST2SMS_KEY) {
    headers['authorization'] = FAST2SMS_KEY;
  }

  const response = await axios.get(url, { params, headers });
  return response.data;
};

module.exports = sendOtp;
