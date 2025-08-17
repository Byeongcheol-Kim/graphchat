import React from 'react'
import { Button, ButtonProps } from '@mui/material'
import { buttonStyles } from '@shared/theme/styles'

const StyledButton: React.FC<ButtonProps> = ({ sx, ...props }) => {
  return (
    <Button
      {...props}
      sx={{
        ...buttonStyles,
        ...sx,
      }}
    />
  )
}

export default StyledButton