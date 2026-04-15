const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for:', username);
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      console.warn('User not found:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn('Password mismatch for:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
};

exports.getMe = (req, res) => {
  res.json(req.user);
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await supabase
      .from('users')
      .update({ password: hashedNewPassword })
      .eq('id', req.user.id);
      
    res.json({ message: 'Password changed successfully! ✨' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
