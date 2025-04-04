/**
 * Voice Controller
 */

/**
 * Get available voices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAvailableVoices = async (req, res) => {
  try {
    // List of available voices from ResponsiveVoice
    const voices = [
      { id: 'UK English Female', name: 'UK English Female' },
      { id: 'UK English Male', name: 'UK English Male' },
      { id: 'US English Female', name: 'US English Female' },
      { id: 'US English Male', name: 'US English Male' },
      { id: 'Australian Female', name: 'Australian Female' },
      { id: 'Australian Male', name: 'Australian Male' },
      { id: 'Japanese Female', name: 'Japanese Female' },
      { id: 'Japanese Male', name: 'Japanese Male' },
      { id: 'Korean Female', name: 'Korean Female' },
      { id: 'Korean Male', name: 'Korean Male' },
      { id: 'Chinese Female', name: 'Chinese Female' },
      { id: 'Chinese Male', name: 'Chinese Male' },
      { id: 'French Female', name: 'French Female' },
      { id: 'French Male', name: 'French Male' },
      { id: 'German Female', name: 'German Female' },
      { id: 'German Male', name: 'German Male' },
      { id: 'Italian Female', name: 'Italian Female' },
      { id: 'Italian Male', name: 'Italian Male' },
      { id: 'Spanish Female', name: 'Spanish Female' },
      { id: 'Spanish Male', name: 'Spanish Male' }
    ];
    
    res.json({
      success: true,
      voices
    });
  } catch (err) {
    console.error('Error in get available voices:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
