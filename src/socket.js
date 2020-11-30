
module.exports = {
  name: 'SocketManager',
  init() {
  },
  data() {
    return {
      io: null,
    };
  },
  events: {
    'VolanteDashboard.socket.io'(io) {
      this.$log('setting up socket.io for /changeme events');
      this.io = io;
    },
    '*'(...args) {
			if (args[0].startsWith('changeme')) { // filter events
				this.lastEvents++;
				this.totalEvents++;
				if (this.io) {
					this.io.of('/changeme').emit('changeme.event', ...args);
				}
			}
		},
  },
};