// Page pour forfait.html
document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname.includes('forfait.html')) {
        const radios = document.querySelectorAll('input[name="forfait"]');
        const montantBox = document.getElementById('montantBox');
        let selectedService = '';
        let montantSaisi = '';

        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                selectedService = radio.value;
                montantBox.style.display =
                    (radio.value === "transfert" ||
                        radio.value === "appels" ||
                        radio.value === "sms" ||
                        radio.value === "internet") && radio.checked
                        ? "block"
                        : "none";
            });
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            const choix = document.querySelector('input[name="forfait"]:checked');
            if (!choix) {
                alert("Veuillez choisir un forfait.");
                return;
            }
            const montant = document.getElementById('montant')?.value;
            montantSaisi = montant || '';

            if (choix.value === "transfert" && !montant) {
                alert("Veuillez entrer le montant du transfert.");
                return;
            }

            localStorage.setItem('serviceChoisi', selectedService);
            localStorage.setItem('montantSaisi', montantSaisi);

            window.location.href = "contact.html";
        });
    }

    // Page contact.html
    if (window.location.pathname.includes('contact.html')) {
        const phoneInput = document.getElementById('phone-number');
        const providerDisplay = document.getElementById('provider-name');
        const providerLogo = document.getElementById('provider-logo');
        const errorMessage = document.getElementById('error-message');
        const confirmBtn = document.getElementById('confirm-btn');
        const resumeSection = document.getElementById('resume');
        const resumeNumber = document.getElementById('resume-number');
        const resumeProvider = document.getElementById('resume-provider');
        const resumeTraitant = document.getElementById('resume-traitant'); // ⚡ Ajout

        const serviceChoisi = localStorage.getItem('serviceChoisi');
        const montantSaisi = localStorage.getItem('montantSaisi');

        const providerPrefixes = {
            '01': 'Moov',
            '05': 'MTN',
            '07': 'Orange'
        };

        if (phoneInput) {
            phoneInput.addEventListener('input', () => {
                const value = phoneInput.value.replace(/\s/g, '');
                const isValid = /^\+225[0-9]{10}$/.test(value);

                if (value.length >= 7) {
                    const prefix = value.slice(4, 6);
                    const provider = providerPrefixes[prefix] || 'Non détecté';

                    providerDisplay.textContent = `Opérateur : ${provider}`;
                    providerLogo.classList.toggle('hidden', provider === 'Non détecté');

                    if (provider !== 'Non détecté') {
                        providerLogo.src =
                            provider === 'Orange' ? 'Orange img.png' :
                                provider === 'MTN' ? 'MTN design.png' :
                                    provider === 'Moov' ? 'Moov img.png' : '';
                        providerLogo.alt = `Logo ${provider}`;
                    }

                    confirmBtn.disabled = !isValid || provider === 'Non détecté';
                    confirmBtn.classList.toggle('bg-blue-300', !isValid || provider === 'Non détecté');
                    confirmBtn.classList.toggle('cursor-not-allowed', !isValid || provider === 'Non détecté');
                    confirmBtn.classList.toggle('bg-blue-600', isValid && provider !== 'Non détecté');
                    confirmBtn.classList.toggle('hover:bg-blue-700', isValid && provider !== 'Non détecté');

                    errorMessage.classList.toggle('hidden', isValid);
                } else {
                    providerDisplay.textContent = 'Opérateur : Non détecté';
                    providerLogo.classList.add('hidden');
                    confirmBtn.disabled = true;
                    confirmBtn.classList.add('bg-blue-300', 'cursor-not-allowed');
                    confirmBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                    errorMessage.classList.add('hidden');
                }
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const number = phoneInput.value;
                const prefix = number.slice(4, 6);
                const provider = providerPrefixes[prefix] || 'Non détecté';

                if (provider !== 'Non détecté' && /^\+225[0-9]{10}$/.test(number)) {
                    resumeNumber.textContent = `Numéro : ${number}`;
                    resumeProvider.textContent = `Opérateur : ${provider}`;
                    resumeSection.classList.remove('hidden');

                    fetch("/.netlify/functions/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                        telephone: number,
                        operateur: provider,
                        forfait: serviceChoisi,
                        montant: montantSaisi,
                        service: serviceChoisi
})

                    })
                        .then(res => res.json())
                        .then(data => {
                            console.log("Message envoyé ✅", data);

                            if (data.traitant) {
                                resumeTraitant.textContent = `Envoyer le paiement à : ${data.traitant.nom} (${data.traitant.numero})`;
                            }
                        })
                        .catch(err => console.error("Erreur Telegram ❌", err));

                    localStorage.removeItem('serviceChoisi');
                    localStorage.removeItem('montantSaisi');
                }
            });
        }
    }
});

