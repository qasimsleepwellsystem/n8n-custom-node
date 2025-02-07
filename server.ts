import express, { Request, Response } from 'express';
import { FriendGrid } from './dist/nodes/FriendGrid/FriendGrid.node';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

// POST /test endpoint to execute the FriendGrid node with a real API call.
app.post('/test', async (req: Request, res: Response) => {
	// Create an instance of your node.
	const friendGrid = new FriendGrid();

	// Define a fake n8n runtime context.
	const fakeThis: any = {
		// Simulate input data from previous nodes.
		getInputData: () => [{ json: {} }],
		// Retrieve node parameters, allowing overrides from the request body.
		getNodeParameter: (parameterName: string, index: number) => {
			const defaults: Record<string, any> = {
				resource: 'contact',
				operation: 'create',
				email: 'test@example.com',
				additionalFields: { firstName: 'John', lastName: 'Doe' },
			};
			return req.body[parameterName] || defaults[parameterName];
		},
		// Define helper functions that simulate n8n's runtime helpers.
		helpers: {
			// This helper now makes an actual HTTP request to SendGrid using Axios.
			requestWithAuthentication: async (credentialName: string, options: any) => {
				// Set required headers (including Content-Type and the API key from the .env file).
				options.headers = {
					...options.headers,
					'Content-Type': 'application/json',
					Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, // API key loaded from .env
				};
				try {
					// Use options.url (updated to match the node code)
					const response = await axios({
						method: options.method,
						url: options.url,
						headers: options.headers,
						data: options.body,
					});
					return response.data;
				} catch (error: any) {
					if (error.response) {
						// Log detailed error response from SendGrid.
						console.error('Error response from SendGrid:', error.response.data);
						throw new Error(
							`HTTP Request failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`
						);
					} else {
						throw new Error(`HTTP Request failed: ${error.message}`);
					}
				}
			},
			// This helper wraps the response data in the expected n8n format.
			returnJsonArray: (data: any) => data.map((item: any) => ({ json: item })),
		},
	};

	try {
		// Call the node's execute method with the fake context.
		const result = await friendGrid.execute.call(fakeThis);
		res.json(result);
	} catch (error: any) {
		console.error('Error during test execution:', error);
		res.status(500).json({ error: error.message });
	}
});

// Start the Express server.
app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
