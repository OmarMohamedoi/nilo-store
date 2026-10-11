/* validators.js - validation rules used by several pages.
   Each returns an object like { fieldName: "message" }. Empty object = valid. */

function validateRegistration(data, emailTaken) {
  const errors = {};

  if (!data.name) {
    errors.name = "Enter your full name.";
  } else if (data.name.length < 3 || data.name.length > 40) {
    errors.name = "Name must be between 3 and 40 characters.";
  } else if (!/^[\p{L}][\p{L} .'-]*$/u.test(data.name)) {
    errors.name = "Name can only contain letters and spaces.";
  }

  if (!data.email) {
    errors.email = "Enter your email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Enter a valid email, like name@mail.com.";
  } else if (emailTaken) {
    errors.email = "This email is already registered. Try logging in.";
  }

  if (!data.password) {
    errors.password = "Enter a password.";
  } else if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (data.password.length > 64) {
    errors.password = "Password must be 64 characters or fewer.";
  } else if (!/[A-Za-z]/.test(data.password) || !/\d/.test(data.password)) {
    errors.password = "Password must contain at least one letter and one number.";
  }

  if (!data.confirm) {
    errors.confirm = "Confirm your password.";
  } else if (data.confirm !== data.password) {
    errors.confirm = "Passwords do not match.";
  }

  return errors;
}

function validateReview(data) {
  const errors = {};
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5)
    errors.rating = "Choose a rating from 1 to 5 stars.";
  if (data.comment.length > 300) errors.comment = "Comment must be 300 characters or fewer.";
  else if (data.comment && data.comment.length < 3)
    errors.comment = "Comment must be at least 3 characters, or leave it empty.";
  return errors;
}

function validateReturn(data) {
  const errors = {};
  if (!data.reason) errors.reason = "Choose a reason.";
  if (data.note.length > 300) errors.note = "Details must be 300 characters or fewer.";
  else if (data.reason === "Other" && data.note.length < 5)
    errors.note = "Please explain the reason (at least 5 characters).";
  return errors;
}
