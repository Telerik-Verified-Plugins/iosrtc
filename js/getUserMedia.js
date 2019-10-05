/**
 * Expose the getUserMedia function.
 */
module.exports = getUserMedia;


/**
 * Dependencies.
 */
var
	debug = require('debug')('iosrtc:getUserMedia'),
	debugerror = require('debug')('iosrtc:ERROR:getUserMedia'),
	exec = require('cordova/exec'),
	MediaStream = require('./MediaStream'),
	Errors = require('./Errors');

function isPositiveInteger(number) {
	return typeof number === 'number' && number >= 0 && number % 1 === 0;
}

function isPositiveFloat(number) {
	return typeof number === 'number' && number >= 0;
}


function getUserMedia(constraints) {

	// Detect callback usage to assist 5.0.1 to 5.0.2 migration
	// TODO remove on 6.0.0
	Errors.detectDeprecatedCallbaksUsage('cordova.plugins.iosrtc.getUserMedia', arguments);

	debug('[original constraints:%o]', constraints);

	var
		audioRequested = false,
		videoRequested = false,
		newConstraints = {};

	if (
		typeof constraints !== 'object' ||
			(!constraints.hasOwnProperty('audio') && !constraints.hasOwnProperty('video'))
	) {
		return new Promise(function (resolve, reject) {
			reject(new Errors.MediaStreamError('constraints must be an object with at least "audio" or "video" keys'));
		});
	}

	if (newConstraints.audio) {
		audioRequested = true;
	}

	if (constraints.video) {
		videoRequested = true;
	}

	// https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
	// Example:
	//
	// getUserMedia({
	//  audio: {
	//  	deviceId: 'azer-asdf-zxcv',
	//  },
	//  video: {
	//  	deviceId: 'qwer-asdf-zxcv',
	//      aspectRatio: 1.777.
	//      facingMode: 'user',
	//  	width: {
	//  		min: 400,
	//  		max: 600
	//  	},
	//  	frameRate: {
	//  		min: 1.0,
	//  		max: 60.0
	//  	}
	//  }
	// });

	/*
	// See: https://www.w3.org/TR/mediacapture-streams/#media-track-constraints
	dictionary MediaTrackConstraintSet {
	 ConstrainULong     width;
	 ConstrainULong     height;
	 ConstrainDouble    aspectRatio;
	 ConstrainDouble    frameRate;
	 ConstrainDOMString facingMode;
	 ConstrainDOMString resizeMode;
	 ConstrainULong     sampleRate;
	 ConstrainULong     sampleSize;
	 ConstrainBoolean   echoCancellation;
	 ConstrainBoolean   autoGainControl;
	 ConstrainBoolean   noiseSuppression;
	 ConstrainDouble    latency;
	 ConstrainULong     channelCount;
	 ConstrainDOMString deviceId;
	 ConstrainDOMString groupId;
	};
	 
	 // typedef ([Clamp] unsigned long or ConstrainULongRange) ConstrainULong;
	 // We convert unsigned long to ConstrainULongRange.exact

	 dictionary ULongRange {
		[Clamp] unsigned long max;
		[Clamp] unsigned long min;
	 };

	 dictionary ConstrainULongRange : ULongRange {
		  [Clamp] unsigned long exact;
		  [Clamp] unsigned long ideal;
	 };
	 
	 // See: https://www.w3.org/TR/mediacapture-streams/#dom-doublerange
	 // typedef (double or ConstrainDoubleRange) ConstrainDouble;
	 // We convert double to ConstrainDoubleRange.exact
	 dictionary ConstrainDouble {
		double max;
		double min;
	 };
	 
	 dictionary ConstrainDoubleRange : DoubleRange {
		double exact;
		double ideal;
	 };
	 
	 // typedef (boolean or ConstrainBooleanParameters) ConstrainBoolean;
	 dictionary ConstrainBooleanParameters {
		boolean exact;
		boolean ideal;
	 };
	 
	 // typedef (DOMString or sequence<DOMString> or ConstrainDOMStringParameters) ConstrainDOMString;
	 // We convert DOMString to ConstrainDOMStringParameters.exact
	 dictionary ConstrainDOMStringParameters {
		(DOMString or sequence<DOMString>) exact;
		(DOMString or sequence<DOMString>) ideal;
	 };
	*/

	// Get video constraints
	if (videoRequested) {
		// Handle object video constraints
		newConstraints.video = {};

		// Get requested video deviceId.
		if (typeof constraints.video.deviceId === 'string') {
			newConstraints.video.deviceId = {
				exact: constraints.video.deviceId
			};

		// Also check video sourceId (mangled by adapter.js).
		} else if (typeof constraints.video.sourceId === 'string') {
			newConstraints.video.deviceId = {
				exact: constraints.video.sourceId
			};

		// Also check deviceId.(exact|ideal)
		} else if (typeof constraints.video.deviceId === 'object') {
			if (!!constraints.video.deviceId.exact) {
				newConstraints.video.deviceId = {
					exact: Array.isArray(constraints.video.deviceId.exact) ? 
						constraints.video.deviceId.exact[0] : constraints.video.deviceId.exact
				};
			} else if (!!constraints.video.deviceId.ideal) {
				newConstraints.video.deviceId = {
					ideal: Array.isArray(constraints.video.deviceId.ideal) ? 
							constraints.video.deviceId.ideal[0] : constraints.video.deviceId.ideal
				};
			}
		}

		// Get requested width min/max, exact.
		if (typeof constraints.video.width === 'object') {
			newConstraints.video.width = {};
			if (isPositiveInteger(constraints.video.width.min)) {
				newConstraints.video.width.min = constraints.video.width.min;
			}
			if (isPositiveInteger(constraints.video.width.max)) {
				newConstraints.video.width.max = constraints.video.width.max;
			}
			// TODO exact, ideal

		// Get requested width long as exact
		} else if (isPositiveFloat(constraints.video.width)) {
			newConstraints.video.width = {
				exact: constraints.video.width
			};
		}

		// Get requested height min/max, exact.
		if (typeof constraints.video.height === 'object') {
			newConstraints.video.height = {};
			if (isPositiveInteger(constraints.video.height.min)) {
				newConstraints.video.height.min = constraints.video.height.min;
			}
			if (isPositiveInteger(constraints.video.height.max)) {
				newConstraints.video.height.max = constraints.video.height.max;
			}
			// TODO exact, ideal

		// Get requested height long as exact
		} else if (isPositiveFloat(constraints.video.height)) {
			newConstraints.video.height = {
				exact: constraints.video.height
			};
		}

		// Get requested frameRate min/max.
		if (typeof constraints.video.frameRate === 'object') {
			newConstraints.video.frameRate = {};
			if (isPositiveFloat(constraints.video.frameRate.min)) {
				newConstraints.video.frameRate.min = constraints.video.frameRate.min;
			}
			if (isPositiveFloat(constraints.video.frameRate.max)) {
				newConstraints.video.frameRate.max = constraints.video.frameRate.max;
			}
			// TODO exact, ideal

		// Get requested frameRate double as exact
		} else if (isPositiveFloat(constraints.video.frameRate)) {
			newConstraints.video.frameRate = {
				exact: constraints.video.frameRate
			};
		}

		// get aspectRatio (e.g 1.7777777777777777)
		// TODO ConstrainDouble min, max
		if (isPositiveFloat(constraints.video.aspectRatio)) {
			newConstraints.video.aspectRatio = {
				exact: constraints.video.aspectRatio
			};
		}

		// get facingMode (e.g environment, user)
		// TODO ConstrainDOMStringParameters ideal, exact
		if (typeof constraints.video.facingMode === 'string') {
			newConstraints.video.facingMode = {
				exact: constraints.video.facingMode
			};
		}
	}

	// Get audio constraints
	if (audioRequested) {
		// Handle object audio constraints
		newConstraints.audio = {};

		// Get requested audio deviceId.
		if (typeof constraints.audio.deviceId === 'string') {
			newConstraints.audio.deviceId = {
				exact: constraints.audio.deviceId
			};

		// Also check audio sourceId (mangled by adapter.js).
		} else if (typeof constraints.audio.sourceId === 'string') {
			newConstraints.audio.deviceId = {
				exact: constraints.audio.sourceId
			};

		// Also check deviceId.(exact|ideal)
		} else if (typeof constraints.audio.deviceId === 'object') {
			if (!!constraints.audio.deviceId.exact) {
				newConstraints.audio.deviceId = {
					exact: Array.isArray(constraints.audio.deviceId.exact) ? 
						constraints.audio.deviceId.exact[0] : constraints.audio.deviceId.exact
				};
			} else if (!!constraints.audio.deviceId.ideal) {
				newConstraints.audio.deviceId = {
					ideal: Array.isArray(constraints.audio.deviceId.ideal) ? 
							constraints.audio.deviceId.ideal[0] : constraints.audio.deviceId.ideal
				};
			}
		}	
	}

	debug('[computed constraints:%o]', newConstraints);

	return new Promise(function (resolve, reject) {
		function onResultOK(data) {
			debug('getUserMedia() | success');
			var stream = MediaStream.create(data.stream);
			resolve(stream);
			// Emit "connected" on the stream.
			stream.emitConnected();
		}

		function onResultError(error) {
			debugerror('getUserMedia() | failure: %s', error);
			reject(new Errors.MediaStreamError('getUserMedia() failed: ' + error));
		}

		exec(onResultOK, onResultError, 'iosrtcPlugin', 'getUserMedia', [newConstraints]);
	});
}