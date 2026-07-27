import serverless from "serverless-http";
import apiApp from "../../src/apiApp";

export const handler = serverless(apiApp);
