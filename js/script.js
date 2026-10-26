// Only the product selector changes in this static design phase.
const productData = {
  original: {
    number: '01 / 03',
    name: '칠성사이다<br>오리지널',
    description: '초록 캔에 담긴, 가장 익숙한 청량함.',
    packages: {
      can: { image: 'img/display/original-can.png', alt: '칠성사이다 오리지널 캔', label: 'THE ORIGINAL / CAN' },
      pet: { image: 'img/display/original-pet.png', alt: '칠성사이다 오리지널 PET', label: 'THE ORIGINAL / PET' }
    }
  },
  peach: {
    number: '02 / 03',
    name: '칠성사이다 리치<br>PEACH',
    description: '복숭아 비주얼이 담긴 리치 패키지.',
    packages: {
      pet: { image: 'img/display/rich-peach-bottle.png', alt: '칠성사이다 리치 피치 PET', label: 'RICH PEACH / PET' }
    }
  },
  grape: {
    number: '03 / 03',
    name: '칠성사이다 리치<br>GRAPE',
    description: '포도 비주얼이 담긴 리치 패키지.',
    packages: {
      pet: { image: 'img/display/rich-grape-bottle.png', alt: '칠성사이다 리치 그레이프 PET', label: 'RICH GRAPE / PET' }
    }
  }
};

const explorer = document.querySelector('.product-explorer');
const kindButtons = [...document.querySelectorAll('.product-kind')];
const packageButtons = [...document.querySelectorAll('.package-option')];
const productImage = document.querySelector('#product-image');
let selectedKind = 'original';
let selectedPackage = 'can';

function renderProduct() {
  const product = productData[selectedKind];
  if (!product.packages[selectedPackage]) selectedPackage = Object.keys(product.packages)[0];
  const packageData = product.packages[selectedPackage];

  kindButtons.forEach(button => {
    const selected = button.dataset.kind === selectedKind;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  packageButtons.forEach(button => {
    const available = Boolean(product.packages[button.dataset.package]);
    const selected = available && button.dataset.package === selectedPackage;
    button.hidden = !available;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  explorer.dataset.kind = selectedKind;
  productImage.src = packageData.image;
  productImage.alt = packageData.alt;
  document.querySelector('#product-stage-label').textContent = packageData.label;
  document.querySelector('#product-number').textContent = product.number;
  document.querySelector('#product-name').innerHTML = product.name;
  document.querySelector('#product-description').textContent = product.description;
}

kindButtons.forEach(button => button.addEventListener('click', () => {
  selectedKind = button.dataset.kind;
  renderProduct();
}));
packageButtons.forEach(button => button.addEventListener('click', () => {
  selectedPackage = button.dataset.package;
  renderProduct();
}));

renderProduct();
