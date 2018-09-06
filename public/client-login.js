const url = new URL(location);
const error = url.searchParams.get('error');

const errorElement = document.querySelector('.error');

if (error) {
  errorElement.style.display = 'block';
}
