var colors = require('colors');

/**********************************************************************************************************************/

/**
 * Utils
 *
 */
module.exports = {
	/**
	 * @return {string}
	 */
	getFormattedDateTime: function(colored) {
		var dt = (new Date()).toString();
		if (colored) {
			return colors.green("[" + dt + "]");
		} else {
			return dt;
		}
	},

	/**
	 *
	 * @param {number} min
	 * @param {number} max
	 * @returns {number}
	 */
	random: function(min, max) {
		return (min + (Math.random() * (max - min)));
	}
};
