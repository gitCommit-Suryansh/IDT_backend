const axios = require("axios");

// 1. Generate Access Token
exports.generateAccessToken = async () => {
  try {
    const client_id = process.env.CLIENT_ID;
    const client_secret = process.env.CLIENT_SECRET;
    const client_version = process.env.CLIENT_VERSION || 1;
    const grant_type = process.env.GRANT_TYPE || "client_credentials";

    const tokenResponse = await axios.post(
      `${process.env.AUTHORIZATION_BASE_URL}${process.env.AUTHORIZATION_END_POINT}`,
      {
        client_id,
        client_version,
        client_secret,
        grant_type,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (tokenResponse.status === 200) {
      return {
        success: true,
        accessToken: tokenResponse.data.access_token,
      };
    } else {
      throw new Error("Failed to generate access token");
    }
  } catch (error) {
    console.error(
      "Error generating access token:",
      error.response?.data || error.message,
    );
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// 2. Create Order (The user called this complete_payment)
exports.createOrder = async (
  merchantOrderId,
  amount,
  mobileNumber,
  redirectUrl,
  callbackUrl,
) => {
  try {
    // Get Token
    const tokenResult = await exports.generateAccessToken();
    if (!tokenResult.success) {
      throw new Error(tokenResult.error);
    }
    const accessToken = tokenResult.accessToken;

    console.log("Creating Order for:", merchantOrderId, "Amount:", amount);

    const paymentResponse = await axios.post(
      `${process.env.CREATE_PAYMENT_URL}${process.env.CREATE_PAYMENT_ENDPOINT}`,
      {
        merchantOrderId: merchantOrderId,
        amount: amount, // in paise
        expireAfter: 1200,
        metaInfo: {
          udf1: `mobileNumber:${mobileNumber}`,
          udf2: `merchantOrderId:${merchantOrderId}`,
          udf3: `amount:${amount}`,
          udf4: `redirectUrl:${redirectUrl}`,
          udf5: `callbackUrl:${callbackUrl}`,
        },
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: "Contest Entry Fee",
          merchantUrls: {
            redirectUrl: redirectUrl,
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${accessToken}`,
        },
      },
    );

    const redirectUrlFinal = paymentResponse.data.redirectUrl; // Check API docs if it's data.data.redirectUrl usually

    // PhonePe API response structure usually: { success: true, code: 'PAYMENT_INITIATED', data: { instrumentResponse: { redirectInfo: { url: ... } } } }
    // But user's snippet accessed `paymentResponse.data.redirectUrl`.
    // I will stick to user's snippet structure but add logging if it fails.

    // User Snippet: const redirectUrlFinal = paymentResponse.data.redirectUrl;
    // NOTE: Standard PhonePe v1 API returns `data.instrumentResponse.redirectInfo.url`.
    // If the user's snippet is for a specific wrapper or version, I will trust it.
    // However, safest is to log the response if undefined.

    return {
      success: true,
      status: paymentResponse.status,
      orderId: paymentResponse.data.orderId, // Check structure
      redirectUrl: redirectUrlFinal,
      merchantOrderId: merchantOrderId,
    };
  } catch (error) {
    console.error(
      "Error in createOrder:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

// 3. Check Status
exports.checkStatus = async (merchantOrderId) => {
  try {
    const tokenResult = await exports.generateAccessToken();
    const accessToken = tokenResult.accessToken;

    // Format: CHECK_PAYMENT_URL / Endpoint1 / merchantOrderId / Endpoint2
    // e.g. https://api-t1.phonepe.com/apis/hermes/pg/v1/status/{merchantOrderId}
    // But user provided disjointed env vars.

    const baseUrl = process.env.CHECK_PAYMENT_URL; // e.g. https://api.phonepe.com/apis/hermes
    const endpoint1 = process.env.CHECK_PAYMENT_ENDPOINT_1; // e.g. /pg/v1/status
    const endpoint2 = process.env.CHECK_PAYMENT_ENDPOINT_2 || ""; // Maybe empty or query param

    // If endpoint2 starts with query params, don't use slash
    // If user said: URL / ENDPOINT1 / ID / ENDPOINT2

    let statusUrl = `${baseUrl}${endpoint1}/${merchantOrderId}`;
    if (endpoint2) {
      statusUrl += `${endpoint2}`;
    }

    console.log("Checking Status URL:", statusUrl);

    const response = await axios.get(statusUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${accessToken}`,
      },
    });

    console.log("PhonePe Status Response:", JSON.stringify(response.data));

    // Maps to the JSON provided by user
    /*
      {
        "state": "COMPLETED",
        "paymentDetails": [ { "transactionId": "...", "state": "COMPLETED" } ]
      }
    */
    const data = response.data;

    // Fallback if paymentDetails is empty but top-level state is there
    let txnId = null;
    if (data.paymentDetails && data.paymentDetails.length > 0) {
      txnId = data.paymentDetails[0].transactionId;
    }

    return {
      success: true,
      state: data.state, // "COMPLETED", "FAILED", "PENDING"
      transactionId: txnId,
      gatewayResponse: data,
    };
  } catch (error) {
    console.error("Error in checkStatus:", error.message, error.response?.data);
    return { success: false, state: "PENDING" };
  }
};
