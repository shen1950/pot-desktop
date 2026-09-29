import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from '@nextui-org/react';
import { MdDeleteOutline } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import React from 'react';

export default function ConfirmDeleteButton(props) {
    const { instanceName, onDelete } = props;
    const { t } = useTranslation();
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    return (
        <>
            <Button
                isIconOnly
                size='sm'
                variant='light'
                color='danger'
                onPress={onOpen}
            >
                <MdDeleteOutline className='text-2xl' />
            </Button>
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                size='sm'
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{t('config.service.delete_confirm_title')}</ModalHeader>
                            <ModalBody>
                                <p>
                                    {t('config.service.delete_confirm_description')}
                                    <span className='font-bold break-all'>「{instanceName}」</span>
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    variant='light'
                                    onPress={onClose}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    color='danger'
                                    onPress={() => {
                                        onClose();
                                        onDelete();
                                    }}
                                >
                                    {t('common.ok')}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
