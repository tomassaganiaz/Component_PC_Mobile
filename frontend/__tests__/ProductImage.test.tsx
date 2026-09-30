import React, { act } from 'react';
import { Image } from 'expo-image';
import renderer from 'react-test-renderer';

import ProductImage from '../src/components/ProductImage';

function renderImage(uri?: string | null) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<ProductImage uri={uri} style={{ width: 50, height: 50 }} />);
  });
  return tree;
}

describe('ProductImage', () => {
  it('muestra el fallback cuando no hay uri', () => {
    const tree = renderImage(null);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renderiza expo-image cuando hay uri', () => {
    const tree = renderImage('https://example.com/img.jpg');
    expect(tree.root.findByType(Image)).toBeTruthy();
  });

  it('el fallback no renderiza un expo-image', () => {
    const tree = renderImage('');
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });
});