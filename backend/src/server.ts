import app from "./app.js";

const PORT = Number(process.env.PORT) || 7000;

app.listen(PORT, () => {
  console.log(`Nexus API running on port ${PORT}`);
});
