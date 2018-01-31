import React from 'react';

import InputComponent from './text';


export default class PasswordComponent extends InputComponent {
    constructor() {
        super();

        // Update input type
        this.state.type = 'password';
    }
}
