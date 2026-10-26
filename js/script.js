// Only the product selector changes in this static design phase.
const productData = {
  original: {
    name: '칠성사이다<br>오리지널',
    packages: {
      can: { image: 'img/display/original-can.png', alt: '칠성사이다 오리지널 캔' },
      pet: { image: 'img/display/original-pet.png', alt: '칠성사이다 오리지널 PET' }
    }
  },
  peach: {
    name: '칠성사이다 리치<br>PEACH',
    packages: {
      pet: { image: 'img/display/rich-peach-bottle.png', alt: '칠성사이다 리치 피치 PET' }
    }
  },
  grape: {
    name: '칠성사이다 리치<br>GRAPE',
    packages: {
      pet: { image: 'img/display/rich-grape-bottle.png', alt: '칠성사이다 리치 그레이프 PET' }
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
  document.querySelector('#product-name').innerHTML = product.name;
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
