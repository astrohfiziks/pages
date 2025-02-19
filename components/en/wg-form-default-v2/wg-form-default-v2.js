/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { toClassName } from '../../../pages/scripts/scripts.js';
import { setupForm } from '../../../pages/blocks/form/form.js';

/** @type {import('../../component').ComponentDecorator} */
export default function decorate(blockEl) {
  blockEl.innerHTML = `
<div class="wg-form-container form-container">
  <form id="wg-form">
    <div class="wg-form-loader">
      <div class="wg-form-loader__indicator"></div>  
    <div>
  </form>
</div>`;
  // const $formContainer = document.querySelector('.wg-form-container');
  const $form = document.getElementById('wg-form');

  function clearButtons() {
    const formType = document.querySelectorAll('main p');
    const buttons = document.querySelectorAll('main p a');

    formType.forEach((text) => {
      if (text.textContent.includes('<Form:') || text.textContent.includes('<form:')) {
        text.style.opacity = 0;
      }
    });

    buttons.forEach((a) => {
      if (a.getAttribute('href').includes('https://adobe.sharepoint.com') || a.getAttribute('href').includes('thank-you') || a.getAttribute('href').includes('thankyou')) {
        a.style.opacity = 0;
      }
    });
  }

  clearButtons();

  async function formData() {
    const formType = document.querySelectorAll('main p');
    let formToUse = '';
    formType.forEach((text) => {
      if (text.textContent.includes('<Form:') || text.textContent.includes('<form:')) {
        formToUse = text.textContent.split(':')[1].split('>')[0].trim();
        text.remove();
      }
    });
    const resp = await fetch(`${formToUse}.json`);
    const json = await resp.json();
    window.hlx.dependencies.push(`${formToUse}.json`);
    return json;
  }

  /**
   * @param {string} pLabel
   * label = string of form input
  */
  function inputSettings(pLabel) {
    const visibleLabel = pLabel;
    let label = pLabel;
    label = label.indexOf(' ') >= 0 ? label.split(' ').join('-').toLowerCase() : label.toLowerCase();
    label = label.indexOf('-*') >= 0 ? label.split('*')[0] : label;
    label = label.indexOf('-(') >= 0 ? label.split('(')[0] : label;
    const settings = {
      label: visibleLabel,
      label_clean: label,
      required: visibleLabel.indexOf('*') >= 0 ? 'required' : '',
    };
    return settings;
  }

  function csvOrLinesToArray(input) {
    if (input.includes('\n')) {
      return input.split('\n').map((o) => o.trim());
    } else {
      return input.split(',').map((o) => o.trim());
    }
  }

  function hideConditionals($inputs, formDefinition, $f) {
    const values = $inputs.map(($i) => {
      if (($i.type === 'checkbox' || $i.type === 'radio') && !$i.checked) return null;
      return $i.value;
    });
    formDefinition.forEach((item) => {
      if (item.show_if) {
        const showIfValues = csvOrLinesToArray(item.show_if);
        let match = false;
        showIfValues.forEach((val) => {
          if (values.includes(val)) match = true;
        });
        const qs = '.radio-el, .select-el, .input-el';
        const $div = $f.querySelector(`[name="${item.name}"]`).closest(qs);
        if (match) $div.classList.remove('hidden');
        else $div.classList.add('hidden');
      }
    });
  }

  async function createForm(formId) {
    let formField = '';
    let formSubmitPresent = false;
    let output = await formData();

    output = output.data;

    output.forEach((item) => {
      const setup = inputSettings(item.label);
      const name = item.name ? item.name : setup.label_clean;
      const required = item.required ? item.required : setup.required;

      // INPUT TEXT || EMAIL
      if (item.type === 'text' || item.type === 'email') {
        formField += `
      <div class="input-el">
        <label for="${name}">${setup.label}</label>
        <input type="${item.type}" name="${name}" ${required}/>
      </div>
      `;
      }

      // RADIO INPUTS
      if (item.type.includes('radio')) {
        const optionsAll = csvOrLinesToArray(item.options);
        let radioOption = '';

        optionsAll.forEach((option) => {
          const cleanOptionName = toClassName(option);
          const id = `${name}-${cleanOptionName}`;
          const value = option.replace('"', '');

          radioOption += `
          <div class="radio-option">
            <input type="radio" id="${id}" name="${name}" value="${value}" ${required}/>
            <label for="${id}">${option}</label>
          </div>
        `;
        });
        formField += `
          <div class="radio-el">
            <span>${item.label}</span>
            <div class="radio-options-parent">
              ${radioOption}
            </div>
          </div>
        `;
      }

      // CHECKBOXES
      if (item.type === 'checkbox') {
        const checkboxOptions = csvOrLinesToArray(item.options);
        let options = '';
        checkboxOptions.forEach((option) => {
          const cleanOptionName = toClassName(option);
          const id = `${name}-${cleanOptionName}`;
          const value = option.replace('"', '');

          options += `
            <div class="radio-option">
              <input type="checkbox" 
                id="${id}" 
                name="${name}"
                value="${value}";
              />
              <label for="${id}">${option}</label>
            </div>
          
          `;
        });
        formField += `
          <div class="input-el checkboxes ${required}">
            <span>${item.label}</span>
            ${options}
          </div>
        `;
      }

      // SELECT
      if (item.type === 'select') {
        const selectOptions = csvOrLinesToArray(item.options);
        let options = '';
        selectOptions.forEach((option) => {
          options += `
            <option>${option}</option>
          `;
        });
        formField += `
          <div class="select-el">
            <label for="${name}">${item.label}</label>
            <select name="${name}" id="${name}">
              ${options}
            </select>
          </div>
        `;
      }

      // TEXTAREA
      if (item.type === 'textarea') {
        formField += `
          <div class="text-el">
            <label for="${name}">${item.label}</label>
            <textarea
              name="${name}"
              cols="30"
              rows="5"
              ${required}></textarea>
          </div>
        `;
      }

      // Submit Button
      if (item.type === 'submit') {
        formField += `
          <div class="submit-el">
            <button type="submit">${item.label}</button>
          </div>
        `;
        formSubmitPresent = true;
      }
    });

    if (!formSubmitPresent) {
      formField += `
      <div class="submit-el">
        <button type="submit">Submit</button>
      </div>`;
    }

    const $formInner = document.getElementById(formId);
    $formInner.innerHTML = formField;

    // show_if
    const showIfTypes = ['select', 'input[type=radio]', 'input[type=checkbox]'];
    const qs = showIfTypes.map((t) => `#${formId} ${t}`).join(',');
    const $inputs = Array.from(document.querySelectorAll(qs));
    $inputs.forEach(($input) => {
      $input.addEventListener('change', () => {
        hideConditionals($inputs, output, $formInner);
      });
    });
    hideConditionals($inputs, output, $formInner);
  }

  function customValidate() {
    const qs = '.radio-el.hidden, .select-el.hidden, .input-el.hidden';
    const $hiddenEls = $form.querySelectorAll(qs);
    $hiddenEls.forEach(($div) => {
      $div.querySelectorAll('[required]').forEach(($r) => {
        console.log($r);
        $r.removeAttribute('required');
      });
    });

    const $requiredCheckboxes = $form.querySelectorAll('.checkboxes.required');
    $requiredCheckboxes.forEach(($div) => {
      console.log($div);
      console.log(`hidden:${$div.classList.contains('hidden')} checked:${$div.querySelector('input:checked')}`);
      if (!$div.classList.contains('hidden') && !$div.querySelector('input:checked')) {
        // needs to be filled in
        $div.querySelector('input[type=checkbox]').setCustomValidity('Please select at least one checkbox.');
      } else {
        $div.querySelector('input[type=checkbox]').setCustomValidity('');
      }
    });
  }

  async function instructor() {
    const formId = 'wg-form';
    await createForm(formId);
    setupForm({
      formId, preValidation: customValidate,
    });
  }

  instructor();
}
