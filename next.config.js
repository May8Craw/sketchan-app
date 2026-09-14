module.exports = {
  reactStrictMode: true,
  rewrites: async () => [
    { source: '/', destination: '/public/index.html' },
  ],
}
