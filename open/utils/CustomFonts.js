import { Global } from '@mantine/core';
import regular from './Inter-Regular.woff';

export function CustomFonts() {
  return (
    <Global
      styles={[
        {
          '@font-face': {
            fontFamily: 'Inter',
            src: `url('${regular}') format("woff")`,
            fontWeight: 500,
            fontStyle: 'normal',
          },
        }
      ]}
    />
  );
}