import blockies from 'blockies';
import PropTypes from 'prop-types';
import React from 'react';
import { Image } from 'semantic-ui-react';

function createIdentityImage (address, scale = 8) {
  return blockies({
    seed: (address || '').toLowerCase(),
    size: 8,
    scale
  }).toDataURL();
}

export default function AccountIcon (props) {
  const { address, style } = props;

  if (typeof address === 'string') {
    return (
      <Image
        inline
        src={createIdentityImage(address)}
        style={Object.assign({ borderRadius: '50%' }, style)}
      />
    );
  }

  return null;
}

AccountIcon.propTypes = {
  address: PropTypes.string,
  style: PropTypes.object
};
