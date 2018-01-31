import React from 'react';

import InputComponent from './input';


export default class TextComponent extends InputComponent {
    constructor() {
        super();

        // Update input type
        this.state.type = 'text';
    }
}
