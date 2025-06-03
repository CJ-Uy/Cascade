console.log("Hello from simple TypeScript ESM test!");
const message: string = "TS-Node ESM test is running!";
console.log(message);

async function main() {
	return Promise.resolve("Async function worked!");
}

main().then(console.log).catch(console.error);
